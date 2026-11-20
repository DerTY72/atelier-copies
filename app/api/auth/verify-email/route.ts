import { NextResponse } from "next/server";
import { setSessionCookie, type AuthUser } from "../../../lib/auth";
import { hashEmailVerificationToken } from "../../../lib/email-verification";
import { getPrisma } from "../../../lib/prisma";
import { getPublicOrigin } from "../../../lib/public-url";

export const runtime = "nodejs";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function redirectToAuthWithNotice(request: Request, notice: string) {
  const url = new URL("/auth", request.url);
  url.searchParams.set("notice", notice);

  return NextResponse.redirect(url);
}

function buildSuccessRedirect(request: Request, nextPath: string) {
  const url = new URL(nextPath, getPublicOrigin(request));
  url.searchParams.set("verified", "1");

  return url;
}

export async function GET(request: Request) {
  const prisma = getPrisma();

  if (!prisma) {
    return redirectToAuthWithNotice(request, "database-unavailable");
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const nextPath = safeNextPath(url.searchParams.get("next"));

  if (!token) {
    return redirectToAuthWithNotice(request, "email-verification-invalid");
  }

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: {
      tokenHash: hashEmailVerificationToken(token),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!verificationToken) {
    return redirectToAuthWithNotice(request, "email-verification-invalid");
  }

  if (verificationToken.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    return redirectToAuthWithNotice(request, "email-verification-expired");
  }

  const verifiedUser = await prisma.$transaction(async (tx) => {
    const verifiedUsersCount = await tx.user.count({
      where: {
        emailVerified: true,
        id: {
          not: verificationToken.userId,
        },
      },
    });

    const user = await tx.user.update({
      where: { id: verificationToken.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        role:
          verificationToken.user.role === "ADMIN" || verifiedUsersCount === 0
            ? "ADMIN"
            : "CUSTOMER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    await tx.emailVerificationToken.deleteMany({
      where: { userId: verificationToken.userId },
    });

    return user;
  });

  const response = NextResponse.redirect(buildSuccessRedirect(request, nextPath));
  setSessionCookie(response, verifiedUser as AuthUser);

  return response;
}
