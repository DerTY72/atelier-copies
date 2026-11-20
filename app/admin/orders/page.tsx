import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getPrisma } from "../../lib/prisma";
import { OrderStatusControl } from "./order-status-control";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  PENDING_PAYMENT: "Ожидает оплаты",
  PAID: "Оплачен",
  CANCELLED: "Отменен",
  FULFILLED: "Выполнен",
};

const deliveryLabels: Record<string, string> = {
  COURIER: "Курьер",
  PICKUP: "Самовывоз",
  TRANSPORT_COMPANY: "ТК",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Ожидает",
  SUCCEEDED: "Успешен",
  FAILED: "Отклонен",
  CANCELLED: "Отменен",
};

const providerLabels: Record<string, string> = {
  TEST: "TEST",
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

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();
  const prisma = getPrisma();

  if (!user) {
    redirect("/auth?next=/admin/orders");
  }

  if (user.role !== "ADMIN") {
    redirect("/account");
  }

  if (!prisma) {
    return (
      <main className="admin-page">
        <section className="admin-shell">
          <p className="eyebrow">Админка</p>
          <h1>База данных не настроена</h1>
          <Link className="button dark" href="/">
            В каталог
          </Link>
        </section>
      </main>
    );
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { titleSnapshot: "asc" },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
    take: 50,
  });

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const pendingCount = orders.filter((order) => order.status === "PENDING_PAYMENT").length;

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Админка</p>
            <h1>Заказы</h1>
          </div>
          <div className="account-actions">
            <Link className="button light" href="/admin/products">
              Товары
            </Link>
            <Link className="button light" href="/admin/support">
              Поддержка
            </Link>
            <Link className="button light" href="/admin/reviews">
              Отзывы
            </Link>
            <Link className="button light" href="/admin/users">
              Пользователи
            </Link>
            <Link className="button dark" href="/">
              В каталог
            </Link>
          </div>
        </div>

        <div className="admin-metrics">
          <div>
            <span>Всего заказов</span>
            <strong>{orders.length}</strong>
          </div>
          <div>
            <span>Ожидают оплаты</span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>Сумма</span>
            <strong>{formatPrice(revenue)}</strong>
          </div>
        </div>

        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Покупатель</th>
                <th>Доставка</th>
                <th>Статус</th>
                <th>Оплата</th>
                <th>Состав</th>
                <th>Сумма</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/orders/${order.id}`}>#{order.id.slice(0, 8)}</Link>
                  </td>
                  <td>
                    <strong>{order.customerName}</strong>
                    <small>{order.customerEmail}</small>
                    <small>{order.customerPhone || "Телефон не указан"}</small>
                  </td>
                  <td>
                    <strong>{deliveryLabels[order.deliveryMethod] || order.deliveryMethod}</strong>
                    <small>{order.deliveryAddress || "Без адреса"}</small>
                    {order.customerComment ? <small>{order.customerComment}</small> : null}
                  </td>
                  <td>
                    <div className="status-stack">
                      <span className="status-pill">{statusLabels[order.status] || order.status}</span>
                      <OrderStatusControl orderId={order.id} status={order.status} />
                    </div>
                  </td>
                  <td>
                    {order.payments[0] ? (
                      <div className="status-stack">
                        <span className="status-pill">
                          {paymentStatusLabels[order.payments[0].status] || order.payments[0].status}
                        </span>
                        <small>{providerLabels[order.payments[0].provider] || order.payments[0].provider}</small>
                        <small>Попыток: {order.payments.length}</small>
                      </div>
                    ) : (
                      <small>Нет попыток</small>
                    )}
                  </td>
                  <td>
                    <ul className="order-item-list">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.titleSnapshot} x {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>{formatPrice(order.total)}</td>
                  <td>{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
