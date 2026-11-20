import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSettingsForm } from "./account-settings-form";
import { LogoutButton } from "./logout-button";
import { getCurrentUser } from "../lib/auth";
import { getPrisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  PENDING_PAYMENT: "Ожидает оплаты",
  PAID: "Оплачен",
  CANCELLED: "Отменен",
  FULFILLED: "Выполнен",
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

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ verified?: string }>;
}) {
  const user = await getCurrentUser();
  const prisma = getPrisma();
  const { verified } = searchParams ? await searchParams : {};

  if (!user) {
    redirect("/auth?next=/account");
  }

  const orders = prisma
    ? await prisma.order.findMany({
        where: { userId: user.id },
        include: {
          items: {
            orderBy: { titleSnapshot: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main className="account-page">
      <section className="account-shell">
        <div className="account-header">
          <div>
            <p className="eyebrow">Личный кабинет</p>
            <h1>{user.name || user.email}</h1>
            {verified === "1" ? <p className="form-message">Email подтвержден. Аккаунт активирован.</p> : null}
            <p>{user.role === "ADMIN" ? "Администратор" : "Покупатель"}</p>
          </div>
          <div className="account-actions">
            <Link className="button light" href="/">
              В каталог
            </Link>
            {user.role === "ADMIN" ? (
              <>
                <Link className="button light" href="/admin/products">
                  Товары
                </Link>
                <Link className="button light" href="/admin/support">
                  Поддержка
                </Link>
                <Link className="button light" href="/admin/reviews">
                  Отзывы
                </Link>
                <Link className="button dark" href="/admin/orders">
                  Заказы
                </Link>
                <Link className="button light" href="/admin/users">
                  Пользователи
                </Link>
              </>
            ) : null}
            <LogoutButton />
          </div>
        </div>

        <div className="account-section">
          <h2>Настройки аккаунта</h2>
          <AccountSettingsForm initialName={user.name || ""} email={user.email} />
        </div>

        <div className="account-section">
          <h2>Мои заказы</h2>
          {orders.length === 0 ? (
            <p className="muted">У этого аккаунта пока нет заказов.</p>
          ) : (
            <div className="account-orders">
              {orders.map((order) => (
                <article className="account-order" key={order.id}>
                  <div>
                    <Link href={`/orders/${order.id}`}>Заказ #{order.id.slice(0, 8)}</Link>
                    <small>{formatDate(order.createdAt)}</small>
                  </div>
                  <span className="status-pill">{statusLabels[order.status] || order.status}</span>
                  <strong>{formatPrice(order.total)}</strong>
                  <ul className="order-item-list">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.titleSnapshot} x {item.quantity}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
