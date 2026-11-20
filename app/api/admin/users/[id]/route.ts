import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { getPrisma } from "../../../../lib/prisma";

type UpdateUserPayload = {
  role?: unknown;
  isBlocked?: unknown;
};

export const runtime = "nodejs";

const allowedRoles = new Set<UserRole>(["ADMIN", "CUSTOMER"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [currentUser, { id }] = await Promise.all([getCurrentUser(), params]);
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  if (!currentUser) {
    return NextResponse.json({ message: "Требуется вход." }, { status: 401 });
  }

  if (currentUser.role !== "ADMIN") {
    return NextResponse.json({ message: "Недостаточно прав." }, { status: 403 });
  }

  const payload = (await request.json()) as UpdateUserPayload;
  const nextRole = typeof payload.role === "string" ? payload.role : undefined;
  const nextBlocked = typeof payload.isBlocked === "boolean" ? payload.isBlocked : undefined;

  if (nextRole && !allowedRoles.has(nextRole as UserRole)) {
    return NextResponse.json({ message: "Недопустимая роль пользователя." }, { status: 400 });
  }

  if (!nextRole && typeof nextBlocked !== "boolean") {
    return NextResponse.json({ message: "Нет изменений для сохранения." }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      isBlocked: true,
      emailVerified: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json({ message: "Пользователь не найден." }, { status: 404 });
  }

  if (targetUser.id === currentUser.id && nextBlocked === true) {
    return NextResponse.json({ message: "Нельзя заблокировать самого себя." }, { status: 400 });
  }

  if (targetUser.id === currentUser.id && nextRole && nextRole !== currentUser.role) {
    return NextResponse.json({ message: "Нельзя менять собственную роль." }, { status: 400 });
  }

  if (nextRole === "ADMIN" && !targetUser.emailVerified) {
    return NextResponse.json(
      { message: "Нельзя назначить администратором пользователя без подтвержденного email." },
      { status: 400 },
    );
  }

  const becomesNonActiveAdmin =
    targetUser.role === "ADMIN" &&
    ((nextRole && nextRole !== "ADMIN") || nextBlocked === true);

  if (becomesNonActiveAdmin) {
    const otherActiveAdmins = await prisma.user.count({
      where: {
        id: { not: targetUser.id },
        role: "ADMIN",
        isBlocked: false,
        emailVerified: true,
      },
    });

    if (otherActiveAdmins === 0) {
      return NextResponse.json(
        { message: "Нельзя оставить сайт без активного администратора." },
        { status: 400 },
      );
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      ...(nextRole ? { role: nextRole as UserRole } : {}),
      ...(typeof nextBlocked === "boolean"
        ? {
            isBlocked: nextBlocked,
            blockedAt: nextBlocked ? new Date() : null,
          }
        : {}),
    },
    select: {
      id: true,
      role: true,
      isBlocked: true,
      blockedAt: true,
    },
  });

  return NextResponse.json({
    message: "Пользователь обновлен.",
    user: updatedUser,
  });
}
