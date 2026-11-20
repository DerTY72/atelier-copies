import { NextResponse } from "next/server";
import { hashPassword } from "../../../lib/auth";
import {
  buildEmailVerificationUrl,
  createEmailVerificationToken,
} from "../../../lib/email-verification";
import { notifyEmailVerification } from "../../../lib/notifications";
import { getPrisma } from "../../../lib/prisma";

type RegisterPayload = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  nextPath?: unknown;
};

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }

  return value;
}

async function sendVerificationOrError({
  name,
  email,
  verificationUrl,
}: {
  name: string | null;
  email: string;
  verificationUrl: string;
}) {
  try {
    await notifyEmailVerification({
      name,
      email,
      verificationUrl,
    });

    return null;
  } catch (error) {
    console.error("Failed to send email verification", error);

    return NextResponse.json(
      {
        message:
          "Не удалось отправить письмо подтверждения на этот email. Проверьте, что почтовый ящик существует и не заблокирован.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  const payload = (await request.json()) as RegisterPayload;
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const nextPath = safeNextPath(payload.nextPath);

  if (!name) {
    return NextResponse.json({ message: "Укажите имя." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "Укажите корректный email." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Пароль должен быть не короче 8 символов." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailVerified: true,
    },
  });

  const passwordHash = await hashPassword(password);
  const verificationToken = createEmailVerificationToken();
  const verificationUrl = buildEmailVerificationUrl(request, verificationToken.token, nextPath);

  if (existingUser) {
    if (existingUser.emailVerified) {
      return NextResponse.json(
        { message: "Пользователь с таким email уже существует." },
        { status: 409 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          passwordHash,
        },
      }),
      prisma.emailVerificationToken.deleteMany({
        where: { userId: existingUser.id },
      }),
      prisma.emailVerificationToken.create({
        data: {
          userId: existingUser.id,
          tokenHash: verificationToken.tokenHash,
          expiresAt: verificationToken.expiresAt,
        },
      }),
    ]);

    const emailError = await sendVerificationOrError({
      name,
      email,
      verificationUrl,
    });

    if (emailError) {
      return emailError;
    }

    return NextResponse.json(
      {
        requiresEmailVerification: true,
        message: "Мы отправили новое письмо для подтверждения email. Проверьте почту и перейдите по ссылке.",
      },
      { status: 202 },
    );
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "CUSTOMER",
      emailVerified: false,
      emailVerificationTokens: {
        create: {
          tokenHash: verificationToken.tokenHash,
          expiresAt: verificationToken.expiresAt,
        },
      },
    },
    select: {
      email: true,
      name: true,
    },
  });

  const emailError = await sendVerificationOrError({
    name: user.name,
    email: user.email,
    verificationUrl,
  });

  if (emailError) {
    return emailError;
  }

  return NextResponse.json(
    {
      requiresEmailVerification: true,
      message: "Аккаунт почти готов. Мы отправили письмо для подтверждения email, перейдите по ссылке из письма.",
    },
    { status: 202 },
  );
}
