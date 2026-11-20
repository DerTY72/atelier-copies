import type { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { getPrisma } from "../../../../lib/prisma";

const allowedStatuses = new Set<OrderStatus>([
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "CANCELLED",
  "FULFILLED",
]);

type UpdateOrderPayload = {
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

  const payload = (await request.json()) as UpdateOrderPayload;
  const status = typeof payload.status === "string" ? payload.status : "";

  if (!allowedStatuses.has(status as OrderStatus)) {
    return NextResponse.json({ message: "Недопустимый статус заказа." }, { status: 400 });
  }

  const nextStatus = status as OrderStatus;

  const order = await prisma.order
    .update({
      where: { id },
      data: { status: nextStatus },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    })
    .catch(() => null);

  if (!order) {
    return NextResponse.json({ message: "Заказ не найден." }, { status: 404 });
  }

  return NextResponse.json({ order });
}
