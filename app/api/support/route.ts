import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import { notifySupportMessageCreated } from "../../lib/notifications";
import { getPrisma } from "../../lib/prisma";

export const runtime = "nodejs";

type CreateSupportMessagePayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const [user, payload] = await Promise.all([
    getCurrentUser(),
    request.json() as Promise<CreateSupportMessagePayload>,
  ]);
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json({ message: "База данных не настроена." }, { status: 503 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ message: "Укажите имя от 2 до 120 символов." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "Укажите корректный email." }, { status: 400 });
  }

  if (message.length < 10 || message.length > 2000) {
    return NextResponse.json(
      { message: "Сообщение должно быть от 10 до 2000 символов." },
      { status: 400 },
    );
  }

  const supportMessage = await prisma.supportMessage.create({
    data: {
      userId: user?.id,
      name,
      email,
      message,
      status: "OPEN",
    },
    select: {
      id: true,
      name: true,
      email: true,
      message: true,
      status: true,
      createdAt: true,
    },
  });

  await notifySupportMessageCreated(supportMessage).catch((error) => {
    console.error("Failed to send support notification", error);
  });

  return NextResponse.json({ supportMessage }, { status: 201 });
}
