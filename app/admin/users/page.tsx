import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getPrisma } from "../../lib/prisma";
import { UserAdminControls } from "./user-admin-controls";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  ADMIN: "Администратор",
  CUSTOMER: "Покупатель",
};

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

function buildUserSearchWhere(search: string): Prisma.UserWhereInput | undefined {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        orders: {
          some: {
            customerName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        orders: {
          some: {
            customerEmail: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        orders: {
          some: {
            customerPhone: {
              contains: search,
            },
          },
        },
      },
    ],
  };
}

function uniquePhones(orders: Array<{ customerPhone: string | null }>) {
  return [...new Set(orders.map((order) => order.customerPhone).filter((phone): phone is string => Boolean(phone)))];
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [user, prisma, params] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(getPrisma()),
    searchParams,
  ]);
  const search = String(params.q || "").trim();

  if (!user) {
    redirect("/auth?next=/admin/users");
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

  const [users, totalUsers, activeAdmins, blockedUsers, unverifiedUsers] = await Promise.all([
    prisma.user.findMany({
      where: buildUserSearchWhere(search),
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            customerPhone: true,
            total: true,
            createdAt: true,
          },
          take: 3,
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            supportMessages: true,
          },
        },
      },
      take: 100,
    }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        role: "ADMIN",
        isBlocked: false,
        emailVerified: true,
      },
    }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.user.count({ where: { emailVerified: false } }),
  ]);

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Админка</p>
            <h1>Пользователи</h1>
          </div>
          <div className="account-actions">
            <Link className="button light" href="/admin/orders">
              Заказы
            </Link>
            <Link className="button light" href="/admin/products">
              Товары
            </Link>
            <Link className="button light" href="/admin/reviews">
              Отзывы
            </Link>
            <Link className="button light" href="/admin/support">
              Поддержка
            </Link>
            <Link className="button dark" href="/">
              В каталог
            </Link>
          </div>
        </div>

        <div className="admin-metrics">
          <div>
            <span>Всего пользователей</span>
            <strong>{totalUsers}</strong>
          </div>
          <div>
            <span>Активные админы</span>
            <strong>{activeAdmins}</strong>
          </div>
          <div>
            <span>Заблокированы</span>
            <strong>{blockedUsers}</strong>
          </div>
          <div>
            <span>Без подтверждения</span>
            <strong>{unverifiedUsers}</strong>
          </div>
        </div>

        <form className="admin-search" action="/admin/users">
          <label>
            Поиск по имени, email или телефону
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Например: Иван, mail@example.com, +7999"
            />
          </label>
          <button className="button dark" type="submit">
            Найти
          </button>
          {search ? (
            <Link className="button light" href="/admin/users">
              Сбросить
            </Link>
          ) : null}
        </form>

        <div className="orders-table-wrap">
          <table className="orders-table users-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Статус</th>
                <th>Контакты</th>
                <th>Активность</th>
                <th>Дата</th>
                <th>Управление</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6}>Пользователи не найдены.</td>
                </tr>
              ) : (
                users.map((managedUser) => {
                  const phones = uniquePhones(managedUser.orders);

                  return (
                    <tr key={managedUser.id}>
                      <td>
                        <strong>{managedUser.name || "Без имени"}</strong>
                        <small>{managedUser.email}</small>
                        {managedUser.id === user.id ? <small>Это ваш аккаунт</small> : null}
                      </td>
                      <td>
                        <div className="status-stack">
                          <span className="status-pill">{roleLabels[managedUser.role]}</span>
                          <small>{managedUser.emailVerified ? "Email подтвержден" : "Email не подтвержден"}</small>
                          <small>{managedUser.isBlocked ? "Заблокирован" : "Активен"}</small>
                        </div>
                      </td>
                      <td>
                        {phones.length > 0 ? (
                          phones.map((phone) => <small key={phone}>{phone}</small>)
                        ) : (
                          <small>Телефон не указан</small>
                        )}
                      </td>
                      <td>
                        <small>Заказов: {managedUser._count.orders}</small>
                        <small>Отзывов: {managedUser._count.reviews}</small>
                        <small>Обращений: {managedUser._count.supportMessages}</small>
                      </td>
                      <td>
                        <small>Создан: {formatDate(managedUser.createdAt)}</small>
                        {managedUser.emailVerifiedAt ? (
                          <small>Email: {formatDate(managedUser.emailVerifiedAt)}</small>
                        ) : null}
                        {managedUser.blockedAt ? <small>Блокировка: {formatDate(managedUser.blockedAt)}</small> : null}
                      </td>
                      <td>
                        <UserAdminControls
                          userId={managedUser.id}
                          currentUserId={user.id}
                          initialRole={managedUser.role}
                          initialIsBlocked={managedUser.isBlocked}
                          emailVerified={managedUser.emailVerified}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
