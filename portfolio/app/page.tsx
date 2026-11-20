import { fallbackProducts } from "../../app/products";
import { Storefront } from "../../app/storefront";

export default function PortfolioHome() {
  return <Storefront currentUser={null} products={fallbackProducts} demo />;
}
