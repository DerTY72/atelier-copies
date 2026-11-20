import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { paymentFailureLabel, paymentProviderLabels } from "../../lib/payment-labels";
import { getPrisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  PENDING_PAYMENT: "Ожидает оплаты",
  PAID: "Оплачен",
  CANCELLED: "Отменен",
  FULFILLED: "Выполнен",
};

const deliveryLabels: Record<string, string> = {
  COURIER: "Курьерская доставка",
  PICKUP: "Самовывоз",
  TRANSPORT_COMPANY: "Транспортная компания",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Ожидает подтверждения",
  SUCCEEDED: "Успешен",
  FAILED: "Отклонен",
  CANCELLED: "Отменен",
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
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [prisma, currentUser] = await Promise.all([Promise.resolve(getPrisma()), getCurrentUser()]);

  if (!prisma) {
    return (
      <main className="order-page">
        <section className="order-shell">
          <p className="eyebrow">Заказ</p>
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
      items: {
        orderBy: { titleSnapshot: "asc" },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const canPay =
    order.status === "PENDING_PAYMENT" &&
    (!order.userId || currentUser?.role === "ADMIN" || currentUser?.id === order.userId);
  const needsLoginToPay = order.status === "PENDING_PAYMENT" && order.userId && !currentUser;

  return (
    <main className="order-page">
      <section className="order-shell">
        <div className="order-topline">
          <div>
            <p className="eyebrow">Заказ создан</p>
            <h1>Заказ #{order.id.slice(0, 8)}</h1>
          </div>
          <span className="status-pill">{statusLabels[order.status] || order.status}</span>
        </div>

        <dl className="order-summary-grid">
          <div>
            <dt>Покупатель</dt>
            <dd>{order.customerName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{order.customerEmail}</dd>
          </div>
          <div>
            <dt>Телефон</dt>
            <dd>{order.customerPhone || "Не указан"}</dd>
          </div>
          <div>
            <dt>Доставка</dt>
            <dd>{deliveryLabels[order.deliveryMethod] || order.deliveryMethod}</dd>
          </div>
          <div>
            <dt>Дата</dt>
            <dd>{formatDate(order.createdAt)}</dd>
          </div>
          <div>
            <dt>Позиций</dt>
            <dd>{itemCount}</dd>
          </div>
        </dl>

        {order.deliveryAddress || order.customerComment ? (
          <div className="order-details-panel">
            {order.deliveryAddress ? (
              <div>
                <strong>Адрес доставки</strong>
                <p>{order.deliveryAddress}</p>
              </div>
            ) : null}
            {order.customerComment ? (
              <div>
                <strong>Комментарий</strong>
                <p>{order.customerComment}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="order-lines">
          {order.items.map((item) => (
            <article className="order-line" key={item.id}>
              <div>
                <strong>{item.titleSnapshot}</strong>
                <small>
                  {item.quantity} x {formatPrice(item.priceSnapshot)}
                </small>
              </div>
              <strong>{formatPrice(item.priceSnapshot * item.quantity)}</strong>
            </article>
          ))}
        </div>

        <div className="order-total">
          <span>Итого</span>
          <strong>{formatPrice(order.total)}</strong>
        </div>

        {canPay ? (
          <div className="payment-panel">
            <div>
              <strong>Платежи</strong>
              <p>Онлайн-оплата недоступна.</p>
            </div>
            <Link className="button primary" href={`/orders/${order.id}/payment`}>
              Открыть платежи
            </Link>
          </div>
        ) : null}

        {order.payments.length > 0 ? (
          <section className="payment-history" aria-labelledby="order-payment-history-title">
            <h2 id="order-payment-history-title">Платежи</h2>
            <div className="payment-history-list">
              {order.payments.map((payment) => (
                <article className="payment-history-item" key={payment.id}>
                  <div>
                    <strong>{paymentProviderLabels[payment.provider] || payment.provider}</strong>
                    <small>{formatDate(payment.createdAt)}</small>
                  </div>
                  <span className="status-pill">
                    {paymentStatusLabels[payment.status] || payment.status}
                  </span>
                  <strong>{formatPrice(payment.amount)}</strong>
                  {payment.failureReason ? <p>{paymentFailureLabel(payment.failureReason)}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {needsLoginToPay ? (
          <div className="payment-panel">
            <div>
              <strong>Войдите для доступа к платежам</strong>
              <p>Этот заказ привязан к аккаунту. Войдите, чтобы продолжить.</p>
            </div>
            <Link className="button dark" href={`/auth?next=/orders/${order.id}`}>
              Войти
            </Link>
          </div>
        ) : null}

        <div className="order-actions">
          <Link className="button dark" href="/">
            Вернуться в каталог
          </Link>
          <Link className="button light" href={`/orders/${order.id}/payment`}>
            Оплата
          </Link>
          <Link className="button light" href="/admin/orders">
            Заказы
          </Link>
        </div>
      </section>
    </main>
  );
}
