import { NextResponse } from "next/server";
import { hashPassword } from "../../../lib/auth";
import { hashPasswordResetToken } from "../../../lib/password-reset";
import { getPrisma } from "../../../lib/prisma";

type ResetPasswordPayload = {
  token?: unknown;
  password?: unknown;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  const payload = (await request.json()) as ResetPasswordPayload;
  const token = String(payload.token || "");
  const password = String(payload.password || "");

  if (!token) {
    return NextResponse.json({ message: "Ссылка восстановления недействительна." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Пароль должен быть не короче 8 символов." },
      { status: 400 },
    );
  }

  const passwordResetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashPasswordResetToken(token),
    },
    include: {
      user: {
        select: {
          id: true,
          emailVerified: true,
        },
      },
    },
  });

  if (!passwordResetToken) {
    return NextResponse.json({ message: "Ссылка восстановления недействительна." }, { status: 400 });
  }

  if (passwordResetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({
      where: { id: passwordResetToken.id },
    });

    return NextResponse.json({ message: "Ссылка восстановления устарела." }, { status: 400 });
  }

  if (!passwordResetToken.user.emailVerified) {
    return NextResponse.json({ message: "Сначала подтвердите email аккаунта." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: passwordResetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: passwordResetToken.userId },
    }),
  ]);

  return NextResponse.json({ message: "Пароль обновлен. Теперь можно войти с новым паролем." });
}
