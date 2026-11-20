import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { getPrisma } from "../../../../lib/prisma";
import { readProductForm, saveProductImage, styleLabels } from "../product-input";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, { id }] = await Promise.all([getCurrentUser(), params]);
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

  const existingProduct = await prisma.product.findUnique({
    where: { id },
    select: { id: true, image: true },
  });

  if (!existingProduct) {
    return NextResponse.json({ message: "Товар не найден." }, { status: 404 });
  }

  let image = parsedForm.imageUrl || existingProduct.image;

  if (parsedForm.imageFile) {
    const savedImage = await saveProductImage(parsedForm.imageFile);

    if (savedImage instanceof NextResponse) {
      return savedImage;
    }

    image = savedImage;
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
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

  return NextResponse.json({ product });
}
