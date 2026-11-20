import type { ReviewStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { getPrisma } from "../../../../lib/prisma";

const allowedStatuses = new Set<ReviewStatus>(["PENDING", "APPROVED", "REJECTED"]);

type UpdateReviewPayload = {
  status?: unknown;
};

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

  const payload = (await request.json()) as UpdateReviewPayload;
  const status = typeof payload.status === "string" ? payload.status : "";

  if (!allowedStatuses.has(status as ReviewStatus)) {
    return NextResponse.json({ message: "Недопустимый статус отзыва." }, { status: 400 });
  }

  const review = await prisma.review
    .update({
      where: { id },
      data: { status: status as ReviewStatus },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    })
    .catch(() => null);

  if (!review) {
    return NextResponse.json({ message: "Отзыв не найден." }, { status: 404 });
  }

  return NextResponse.json({ review });
}
