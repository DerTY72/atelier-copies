import type { DeliveryMethod, OrderItem, OrderStatus, SupportStatus } from "@prisma/client";
import { getNotificationRecipients, sendMail } from "./mail";

type OrderForNotification = {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
  customerComment: string | null;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  items: OrderItem[];
};

type SupportMessageForNotification = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: SupportStatus;
  createdAt: Date;
};

type EmailVerificationNotification = {
  name: string | null;
  email: string;
  verificationUrl: string;
};

type PasswordResetNotification = {
  name: string | null;
  email: string;
  resetUrl: string;
};

const deliveryLabels: Record<DeliveryMethod, string> = {
  COURIER: "Курьерская доставка",
  PICKUP: "Самовывоз",
  TRANSPORT_COMPANY: "Транспортная компания",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

function renderOrderItems(items: OrderItem[]) {
  return items
    .map((item) => {
      const lineTotal = item.priceSnapshot * item.quantity;
      return `- ${item.titleSnapshot}: ${item.quantity} x ${formatPrice(item.priceSnapshot)} = ${formatPrice(lineTotal)}`;
    })
    .join("\n");
}

function renderOrderDetails(order: OrderForNotification) {
  return [
    `Заказ: #${order.id.slice(0, 8)}`,
    `Дата: ${formatDate(order.createdAt)}`,
    `Статус: ${order.status}`,
    "",
    "Покупатель:",
    `Имя: ${order.customerName || "Не указано"}`,
    `Email: ${order.customerEmail || "Не указан"}`,
    `Телефон: ${order.customerPhone || "Не указан"}`,
    "",
    "Доставка:",
    `Способ: ${deliveryLabels[order.deliveryMethod]}`,
    `Адрес: ${order.deliveryAddress || "Без адреса"}`,
    order.customerComment ? `Комментарий: ${order.customerComment}` : null,
    "",
    "Состав заказа:",
    renderOrderItems(order.items),
    "",
    `Итого: ${formatPrice(order.total)}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export async function notifyOrderCreated(order: OrderForNotification) {
  const { adminEmail } = getNotificationRecipients();
  const orderDetails = renderOrderDetails(order);
  const tasks = [
    sendMail({
      to: adminEmail,
      subject: `Новый заказ #${order.id.slice(0, 8)}`,
      text: [`На сайте появился новый заказ.`, "", orderDetails].join("\n"),
      replyTo: order.customerEmail || undefined,
    }),
  ];

  if (order.customerEmail) {
    tasks.push(
      sendMail({
        to: order.customerEmail,
        subject: `Ваш заказ #${order.id.slice(0, 8)} создан`,
        text: [
          `Здравствуйте, ${order.customerName || "покупатель"}!`,
          "",
          "Мы получили ваш заказ и скоро свяжемся для подтверждения деталей.",
          "",
          orderDetails,
        ].join("\n"),
      }),
    );
  }

  await Promise.all(tasks);
}

export async function notifySupportMessageCreated(message: SupportMessageForNotification) {
  const { adminEmail } = getNotificationRecipients();

  await sendMail({
    to: adminEmail,
    subject: `Новое обращение в поддержку #${message.id.slice(0, 8)}`,
    replyTo: message.email,
    text: [
      "На сайте появилось новое обращение в поддержку.",
      "",
      `Обращение: #${message.id.slice(0, 8)}`,
      `Дата: ${formatDate(message.createdAt)}`,
      `Статус: ${message.status}`,
      "",
      `Имя: ${message.name}`,
      `Email: ${message.email}`,
      "",
      "Сообщение:",
      message.message,
    ].join("\n"),
  });
}

export async function notifyEmailVerification(message: EmailVerificationNotification) {
  await sendMail({
    to: message.email,
    subject: "Подтверждение регистрации в Atelier Copies",
    text: [
      `Здравствуйте, ${message.name || "покупатель"}!`,
      "",
      "Чтобы завершить регистрацию на сайте Atelier Copies, подтвердите email по ссылке ниже.",
      "",
      message.verificationUrl,
      "",
      "Ссылка действует 24 часа. Если вы не регистрировались на сайте, просто проигнорируйте это письмо.",
    ].join("\n"),
  });
}

export async function notifyPasswordReset(message: PasswordResetNotification) {
  await sendMail({
    to: message.email,
    subject: "Восстановление пароля в Atelier Copies",
    text: [
      `Здравствуйте, ${message.name || "покупатель"}!`,
      "",
      "Мы получили запрос на восстановление пароля. Чтобы задать новый пароль, перейдите по ссылке ниже.",
      "",
      message.resetUrl,
      "",
      "Ссылка действует 1 час. Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.",
    ].join("\n"),
  });
}
