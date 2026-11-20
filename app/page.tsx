import { Storefront } from "./storefront";
import { getCatalogProducts } from "./lib/catalog";
import { getCurrentUser } from "./lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, currentUser] = await Promise.all([getCatalogProducts(), getCurrentUser()]);

  return <Storefront currentUser={currentUser} products={products} />;
}
