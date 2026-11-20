import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { ProductStyle } from "@prisma/client";
import { NextResponse } from "next/server";

export const styleLabels: Record<ProductStyle, string> = {
  IMPRESSIONISM: "Импрессионизм",
  RENAISSANCE: "Ренессанс",
  MODERN: "Модерн",
};

const maxImageSize = 8 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export type ProductFormInput = {
  title: string;
  artist: string;
  style: ProductStyle;
  size: string;
  price: number;
  imageUrl: string;
  description: string;
  isActive: boolean;
  imageFile: File | null;
};

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function slugifyProductTitle(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || `product-${randomUUID().slice(0, 8)}`;
}

export async function readProductForm(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Некорректная форма товара." }, { status: 400 });
  }

  const title = readString(formData.get("title"));
  const artist = readString(formData.get("artist"));
  const style = readString(formData.get("style")) as ProductStyle;
  const size = readString(formData.get("size"));
  const price = Math.floor(Number(readString(formData.get("price"))));
  const imageUrl = readString(formData.get("imageUrl"));
  const description = readString(formData.get("description"));
  const isActive = readString(formData.get("isActive")) === "true";
  const image = formData.get("image");

  if (title.length < 2 || title.length > 160) {
    return NextResponse.json({ message: "Название должно быть от 2 до 160 символов." }, { status: 400 });
  }

  if (artist.length < 2 || artist.length > 160) {
    return NextResponse.json({ message: "Укажите автора или источник." }, { status: 400 });
  }

  if (!Object.keys(styleLabels).includes(style)) {
    return NextResponse.json({ message: "Выберите стиль товара." }, { status: 400 });
  }

  if (size.length < 2 || size.length > 80) {
    return NextResponse.json({ message: "Укажите размер." }, { status: 400 });
  }

  if (!Number.isFinite(price) || price <= 0 || price > 10000000) {
    return NextResponse.json({ message: "Укажите корректную цену." }, { status: 400 });
  }

  if (description.length < 10 || description.length > 2000) {
    return NextResponse.json(
      { message: "Описание должно быть от 10 до 2000 символов." },
      { status: 400 },
    );
  }

  const imageFile = image instanceof File && image.size > 0 ? image : null;

  return {
    title,
    artist,
    style,
    size,
    price,
    imageUrl,
    description,
    isActive,
    imageFile,
  } satisfies ProductFormInput;
}

export async function saveProductImage(file: File) {
  const extension = allowedImageTypes.get(file.type);

  if (!extension) {
    return NextResponse.json(
      { message: "Поддерживаются изображения JPG, PNG, WebP и GIF." },
      { status: 400 },
    );
  }

  if (file.size > maxImageSize) {
    return NextResponse.json({ message: "Изображение должно быть не больше 8 МБ." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const filepath = path.join(uploadDir, filename);
  const imageUrl = `/uploads/products/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filepath, buffer);

  return imageUrl;
}
