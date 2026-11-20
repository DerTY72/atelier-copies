import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, verifyPassword } from "../../../lib/auth";
import { getPrisma } from "../../../lib/prisma";

type ChangePasswordPayload = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const [user, prisma] = await Promise.all([getCurrentUser(), Promise.resolve(getPrisma())]);

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({ message: "Требуется вход." }, { status: 401 });
  }

  const payload = (await request.json()) as ChangePasswordPayload;
  const currentPassword = String(payload.currentPassword || "");
  const newPassword = String(payload.newPassword || "");

  if (!currentPassword) {
    return NextResponse.json({ message: "Укажите текущий пароль." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: "Новый пароль должен быть не короче 8 символов." },
      { status: 400 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { message: "Новый пароль должен отличаться от текущего." },
      { status: 400 },
    );
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
    return NextResponse.json({ message: "Текущий пароль указан неверно." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordResetTokens: {
        deleteMany: {},
      },
    },
  });

  return NextResponse.json({ message: "Пароль обновлен." });
}
