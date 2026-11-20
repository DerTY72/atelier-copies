import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getPrisma } from "../../lib/prisma";
import { ProductManager } from "./product-manager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await getCurrentUser();
  const prisma = getPrisma();

  if (!user) {
    redirect("/auth?next=/admin/products");
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

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  const activeCount = products.filter((product) => product.isActive).length;
  const inactiveCount = products.length - activeCount;

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Админка</p>
            <h1>Товары</h1>
          </div>
          <div className="account-actions">
            <Link className="button light" href="/admin/orders">
              Заказы
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
            <span>Всего товаров</span>
            <strong>{products.length}</strong>
          </div>
          <div>
            <span>В каталоге</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <span>Скрыты</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>

        <ProductManager
          initialProducts={products.map((product) => ({
            id: product.id,
            title: product.title,
            artist: product.artist,
            style: product.style,
            styleLabel: product.styleLabel,
            size: product.size,
            price: product.price,
            image: product.image,
            description: product.description,
            isActive: product.isActive,
            createdAt: product.createdAt.toISOString(),
          }))}
        />
      </section>
    </main>
  );
}
