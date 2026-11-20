import { fallbackProducts, type Product, type ProductStyle } from "../products";
import { getPrisma } from "./prisma";

const styleMap: Record<string, ProductStyle> = {
  IMPRESSIONISM: "impressionism",
  RENAISSANCE: "renaissance",
  MODERN: "modern",
};

export async function getCatalogProducts(): Promise<Product[]> {
  const prisma = getPrisma();

  if (!prisma) {
    return fallbackProducts;
  }

  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        reviews: {
          where: {
            status: "APPROVED",
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            authorName: true,
            rating: true,
            type: true,
            text: true,
            videoUrl: true,
            createdAt: true,
          },
        },
      },
    });

    return products.map((product) => ({
      id: product.id,
      title: product.title,
      artist: product.artist,
      style: styleMap[product.style],
      styleLabel: product.styleLabel,
      size: product.size,
      price: product.price,
      image: product.image,
      description: product.description,
      reviews: product.reviews
        .filter((review) => review.text || review.videoUrl)
        .map((review) => ({
          id: review.id,
          authorName: review.authorName,
          rating: review.rating,
          type: review.type,
          text: review.text,
          attachmentUrl: review.videoUrl,
          createdAt: review.createdAt.toISOString(),
        })),
    }));
  } catch (error) {
    console.error("Failed to load products from database. Falling back to fixtures.", error);
    return fallbackProducts;
  }
}
