import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { getPrisma } from "../../../lib/prisma";
import { TestPaymentPanel } from "./test-payment-panel";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  PENDING_PAYMENT: "Ожидает оплаты",
  PAID: "Оплачен",
  CANCELLED: "Отменен",
  FULFILLED: "Выполнен",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Ожидает подтверждения",
  SUCCEEDED: "Успешен",
  FAILED: "Отклонен",
  CANCELLED: "Отменен",
};

const providerLabels: Record<string, string> = {
  TEST: "Тестовый провайдер",
  YOOKASSA: "ЮKassa",
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

export default async function OrderPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [prisma, currentUser] = await Promise.all([Promise.resolve(getPrisma()), getCurrentUser()]);

  if (!prisma) {
    return (
      <main className="order-page">
        <section className="order-shell">
          <p className="eyebrow">Оплата</p>
          <h1>База данных не настроена</h1>
          <Link className="button dark" href="/">
            Вернуться в каталог
          </Link>
        </section>
      </main>
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const canPay =
    order.status === "PENDING_PAYMENT" &&
    (!order.userId || currentUser?.role === "ADMIN" || currentUser?.id === order.userId);
  const needsLoginToPay = order.status === "PENDING_PAYMENT" && order.userId && !currentUser;
  const pendingPayment = order.payments.find((payment) => payment.status === "PENDING") || null;

  return (
    <main className="order-page">
      <section className="order-shell">
        <div className="order-topline">
          <div>
            <p className="eyebrow">Оплата заказа</p>
            <h1>Заказ #{order.id.slice(0, 8)}</h1>
          </div>
          <span className="status-pill">{statusLabels[order.status] || order.status}</span>
        </div>

        <div className="payment-checkout">
          <div>
            <span>К оплате</span>
            <strong>{formatPrice(order.total)}</strong>
          </div>
          <p>
            Сейчас используется учебный провайдер TEST. Он не списывает деньги, но создает
            реальные записи платежей в базе и обновляет статус заказа.
          </p>
        </div>

        {canPay ? (
          <TestPaymentPanel
            orderId={order.id}
            initialPayment={
              pendingPayment
                ? {
                    id: pendingPayment.id,
                    status: pendingPayment.status,
                  }
                : null
            }
          />
        ) : null}

        {needsLoginToPay ? (
          <div className="payment-panel">
            <div>
              <strong>Войдите для оплаты</strong>
              <p>Этот заказ привязан к аккаунту. Войдите, чтобы продолжить оплату.</p>
            </div>
            <Link className="button dark" href={`/auth?next=/orders/${order.id}/payment`}>
              Войти
            </Link>
          </div>
        ) : null}

        {order.status === "PAID" ? (
          <div className="payment-panel">
            <div>
              <strong>Заказ оплачен</strong>
              <p>Платеж успешно завершен, заказ находится в статусе “Оплачен”.</p>
            </div>
          </div>
        ) : null}

        <section className="payment-history" aria-labelledby="payment-history-title">
          <h2 id="payment-history-title">История платежей</h2>
          {order.payments.length === 0 ? (
            <p className="muted">Платежных попыток пока нет.</p>
          ) : (
            <div className="payment-history-list">
              {order.payments.map((payment) => (
                <article className="payment-history-item" key={payment.id}>
                  <div>
                    <strong>{providerLabels[payment.provider] || payment.provider}</strong>
                    <small>{formatDate(payment.createdAt)}</small>
                  </div>
                  <span className="status-pill">
                    {paymentStatusLabels[payment.status] || payment.status}
                  </span>
                  <strong>{formatPrice(payment.amount)}</strong>
                  {payment.failureReason ? <p>{payment.failureReason}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="order-actions">
          <Link className="button dark" href={`/orders/${order.id}`}>
            Вернуться к заказу
          </Link>
          <Link className="button light" href="/">
            В каталог
          </Link>
        </div>
      </section>
    </main>
  );
}
