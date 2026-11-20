import type { PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../lib/auth";
import { getPrisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";

type CompletePaymentPayload = {
  status?: unknown;
  failureReason?: unknown;
};

const allowedFinalStatuses = new Set<PaymentStatus>(["SUCCEEDED", "FAILED", "CANCELLED"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const [{ id, paymentId }, user] = await Promise.all([params, getCurrentUser()]);
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  const payload = (await request.json()) as CompletePaymentPayload;
  const status = typeof payload.status === "string" ? payload.status : "";
  const failureReason =
    typeof payload.failureReason === "string" ? payload.failureReason.trim().slice(0, 500) : null;

  if (!allowedFinalStatuses.has(status as PaymentStatus)) {
    return NextResponse.json({ message: "Недопустимый статус платежа." }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      orderId: id,
    },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          userId: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ message: "Платеж не найден." }, { status: 404 });
  }

  const canPay = !payment.order.userId || user?.role === "ADMIN" || user?.id === payment.order.userId;

  if (!canPay) {
    return NextResponse.json(
      { message: user ? "Недостаточно прав." : "Требуется вход." },
      { status: user ? 403 : 401 },
    );
  }

  if (payment.status !== "PENDING") {
    return NextResponse.json({ message: "Этот платеж уже завершен." }, { status: 400 });
  }

  if (payment.order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ message: "Этот заказ сейчас нельзя оплатить." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: status as PaymentStatus,
        failureReason: status === "FAILED" || status === "CANCELLED" ? failureReason : null,
      },
    });

    const updatedOrder =
      status === "SUCCEEDED"
        ? await tx.order.update({
            where: { id: payment.orderId },
            data: { status: "PAID" },
            select: {
              id: true,
              status: true,
              total: true,
            },
          })
        : await tx.order.findUnique({
            where: { id: payment.orderId },
            select: {
              id: true,
              status: true,
              total: true,
            },
          });

    return {
      payment: updatedPayment,
      order: updatedOrder,
    };
  });

  return NextResponse.json(result);
}
