import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { getPrisma } from "../../../lib/prisma";
import { readProductForm, saveProductImage, slugifyProductTitle, styleLabels } from "./product-input";

export const runtime = "nodejs";

async function getUniqueProductId(baseId: string) {
  const prisma = getPrisma();

  if (!prisma) {
    return baseId;
  }

  let candidate = baseId;
  let counter = 2;

  while (await prisma.product.findUnique({ where: { id: candidate }, select: { id: true } })) {
    candidate = `${baseId}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const prisma = getPrisma();

  if (!user) {
    return NextResponse.json({ message: "Требуется вход." }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ message: "Недостаточно прав." }, { status: 403 });
  }

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  const parsedForm = await readProductForm(request);

  if (parsedForm instanceof NextResponse) {
    return parsedForm;
  }

  let image = parsedForm.imageUrl;

  if (parsedForm.imageFile) {
    const savedImage = await saveProductImage(parsedForm.imageFile);

    if (savedImage instanceof NextResponse) {
      return savedImage;
    }

    image = savedImage;
  }

  if (!image) {
    return NextResponse.json({ message: "Добавьте ссылку на изображение или загрузите файл." }, { status: 400 });
  }

  const id = await getUniqueProductId(slugifyProductTitle(parsedForm.title));
  const product = await prisma.product.create({
    data: {
      id,
      title: parsedForm.title,
      artist: parsedForm.artist,
      style: parsedForm.style,
      styleLabel: styleLabels[parsedForm.style],
      size: parsedForm.size,
      price: parsedForm.price,
      image,
      description: parsedForm.description,
      isActive: parsedForm.isActive,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
