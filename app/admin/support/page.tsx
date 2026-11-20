import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getPrisma } from "../../lib/prisma";
import { SupportStatusControl } from "./support-status-control";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  OPEN: "Открыто",
  ANSWERED: "Отвечено",
  CLOSED: "Закрыто",
};

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

export default async function AdminSupportPage() {
  const user = await getCurrentUser();
  const prisma = getPrisma();

  if (!user) {
    redirect("/auth?next=/admin/support");
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

  const messages = await prisma.supportMessage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    take: 100,
  });

  const openCount = messages.filter((message) => message.status === "OPEN").length;
  const answeredCount = messages.filter((message) => message.status === "ANSWERED").length;

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Админка</p>
            <h1>Поддержка</h1>
          </div>
          <div className="account-actions">
            <Link className="button light" href="/admin/products">
              Товары
            </Link>
            <Link className="button light" href="/admin/orders">
              Заказы
            </Link>
            <Link className="button light" href="/admin/reviews">
              Отзывы
            </Link>
            <Link className="button dark" href="/">
              В каталог
            </Link>
          </div>
        </div>

        <div className="admin-metrics">
          <div>
            <span>Всего обращений</span>
            <strong>{messages.length}</strong>
          </div>
          <div>
            <span>Открыты</span>
            <strong>{openCount}</strong>
          </div>
          <div>
            <span>Отвечены</span>
            <strong>{answeredCount}</strong>
          </div>
        </div>

        <div className="orders-table-wrap">
          <table className="support-table">
            <thead>
              <tr>
                <th>Сообщение</th>
                <th>Контакт</th>
                <th>Аккаунт</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={5}>Обращений пока нет.</td>
                </tr>
              ) : (
                messages.map((message) => (
                  <tr key={message.id}>
                    <td>
                      <p className="message-preview">{message.message}</p>
                    </td>
                    <td>
                      <strong>{message.name}</strong>
                      <small>{message.email}</small>
                    </td>
                    <td>
                      <strong>{message.user?.name || "Гость"}</strong>
                      <small>{message.user?.email || "Без аккаунта"}</small>
                    </td>
                    <td>
                      <div className="status-stack">
                        <span className="status-pill">
                          {statusLabels[message.status] || message.status}
                        </span>
                        <SupportStatusControl messageId={message.id} status={message.status} />
                      </div>
                    </td>
                    <td>{formatDate(message.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
