import type { SupportStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { getPrisma } from "../../../../lib/prisma";

const allowedStatuses = new Set<SupportStatus>(["OPEN", "ANSWERED", "CLOSED"]);

type UpdateSupportMessagePayload = {
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

  const payload = (await request.json()) as UpdateSupportMessagePayload;
  const status = typeof payload.status === "string" ? payload.status : "";

  if (!allowedStatuses.has(status as SupportStatus)) {
    return NextResponse.json({ message: "Недопустимый статус обращения." }, { status: 400 });
  }

  const supportMessage = await prisma.supportMessage
    .update({
      where: { id },
      data: { status: status as SupportStatus },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    })
    .catch(() => null);

  if (!supportMessage) {
    return NextResponse.json({ message: "Обращение не найдено." }, { status: 404 });
  }

  return NextResponse.json({ supportMessage });
}
