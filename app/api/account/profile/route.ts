import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { getPrisma } from "../../../lib/prisma";

type UpdateProfilePayload = {
  name?: unknown;
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

  const payload = (await request.json()) as UpdateProfilePayload;
  const name = String(payload.name || "").trim();

  if (!name) {
    return NextResponse.json({ message: "Укажите имя." }, { status: 400 });
  }

  if (name.length > 100) {
    return NextResponse.json({ message: "Имя должно быть не длиннее 100 символов." }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { name },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return NextResponse.json({
    message: "Профиль обновлен.",
    user: updatedUser,
  });
}
