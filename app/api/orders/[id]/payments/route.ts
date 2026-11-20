import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { getPrisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      payments: {
        where: {
          provider: "TEST",
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!order) {
    return NextResponse.json({ message: "Заказ не найден." }, { status: 404 });
  }

  const canPay = !order.userId || user?.role === "ADMIN" || user?.id === order.userId;

  if (!canPay) {
    return NextResponse.json(
      { message: user ? "Недостаточно прав." : "Требуется вход." },
      { status: user ? 403 : 401 },
    );
  }

  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ message: "Этот заказ сейчас нельзя оплатить." }, { status: 400 });
  }

  const existingPayment = order.payments[0];

  if (existingPayment) {
    return NextResponse.json({ payment: existingPayment });
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: "TEST",
      status: "PENDING",
      amount: order.total,
      currency: "RUB",
      confirmationUrl: `/orders/${order.id}/payment`,
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
