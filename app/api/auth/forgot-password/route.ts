import { NextResponse } from "next/server";
import { buildPasswordResetUrl, createPasswordResetToken } from "../../../lib/password-reset";
import { notifyPasswordReset } from "../../../lib/notifications";
import { getPrisma } from "../../../lib/prisma";

type ForgotPasswordPayload = {
  email?: unknown;
};

export const runtime = "nodejs";

const responseMessage =
  "Если аккаунт с таким email существует, мы отправили письмо со ссылкой восстановления пароля.";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  const payload = (await request.json()) as ForgotPasswordPayload;
  const email = String(payload.email || "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "Укажите корректный email." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });

  if (!user || !user.emailVerified) {
    return NextResponse.json({ message: responseMessage });
  }

  const resetToken = createPasswordResetToken();
  const resetUrl = buildPasswordResetUrl(request, resetToken.token);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: resetToken.tokenHash,
        expiresAt: resetToken.expiresAt,
      },
    }),
  ]);

  try {
    await notifyPasswordReset({
      name: user.name,
      email: user.email,
      resetUrl,
    });
  } catch (error) {
    console.error("Failed to send password reset email", error);

    return NextResponse.json(
      {
        message:
          "Не удалось отправить письмо восстановления на этот email. Проверьте, что почтовый ящик существует и не заблокирован.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: responseMessage });
}
