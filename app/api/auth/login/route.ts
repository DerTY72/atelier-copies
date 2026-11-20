import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword, type AuthUser } from "../../../lib/auth";
import { getPrisma } from "../../../lib/prisma";

type LoginPayload = {
  email?: unknown;
  password?: unknown;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  const payload = (await request.json()) as LoginPayload;
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
      emailVerified: true,
      isBlocked: true,
    },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ message: "Неверный email или пароль." }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { message: "Подтвердите email по ссылке из письма, чтобы войти в аккаунт." },
      { status: 403 },
    );
  }

  if (user.isBlocked) {
    return NextResponse.json(
      { message: "Аккаунт заблокирован. Напишите в поддержку, если считаете это ошибкой." },
      { status: 403 },
    );
  }

  const publicUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const response = NextResponse.json({ user: publicUser });
  setSessionCookie(response, publicUser as AuthUser);

  return response;
}
