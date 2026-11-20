import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getPrisma } from "../../lib/prisma";
import { ReviewStatusControl } from "./review-status-control";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  PENDING: "На модерации",
  APPROVED: "Одобрен",
  REJECTED: "Отклонен",
};

const typeLabels: Record<string, string> = {
  TEXT: "Текст",
  PHOTO: "Фото",
  VIDEO: "Видео",
};

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

export default async function AdminReviewsPage() {
  const user = await getCurrentUser();
  const prisma = getPrisma();

  if (!user) {
    redirect("/auth?next=/admin/reviews");
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

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
        },
      },
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    take: 100,
  });

  const pendingCount = reviews.filter((review) => review.status === "PENDING").length;
  const approvedCount = reviews.filter((review) => review.status === "APPROVED").length;

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Админка</p>
            <h1>Отзывы</h1>
          </div>
          <div className="account-actions">
            <Link className="button light" href="/admin/products">
              Товары
            </Link>
            <Link className="button light" href="/admin/support">
              Поддержка
            </Link>
            <Link className="button light" href="/admin/orders">
              Заказы
            </Link>
            <Link className="button dark" href="/">
              В каталог
            </Link>
          </div>
        </div>

        <div className="admin-metrics">
          <div>
            <span>Всего отзывов</span>
            <strong>{reviews.length}</strong>
          </div>
          <div>
            <span>На модерации</span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>Одобрены</span>
            <strong>{approvedCount}</strong>
          </div>
        </div>

        <div className="orders-table-wrap">
          <table className="reviews-table">
            <thead>
              <tr>
                <th>Отзыв</th>
                <th>Товар</th>
                <th>Автор</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <strong>{typeLabels[review.type] || review.type}</strong>
                    {review.rating ? <small>Оценка: {review.rating}/5</small> : null}
                    {review.type === "PHOTO" && review.videoUrl ? (
                      <img className="admin-review-media" src={review.videoUrl} alt="" />
                    ) : null}
                    {review.type === "VIDEO" && review.videoUrl ? (
                      <video className="admin-review-video" src={review.videoUrl} controls />
                    ) : null}
                    {review.text || review.videoUrl ? (
                      <p className="review-preview">
                        {review.text || review.videoUrl}
                      </p>
                    ) : (
                      <p className="review-preview">Содержимое отзыва пока пустое.</p>
                    )}
                  </td>
                  <td>
                    <strong>{review.product.title}</strong>
                    <small>{review.product.id}</small>
                  </td>
                  <td>
                    <strong>{review.authorName}</strong>
                    <small>{review.user?.name || review.user?.email || "Пользователь удален"}</small>
                  </td>
                  <td>
                    <div className="status-stack">
                      <span className="status-pill">
                        {statusLabels[review.status] || review.status}
                      </span>
                      <ReviewStatusControl reviewId={review.id} status={review.status} />
                    </div>
                  </td>
                  <td>{formatDate(review.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
