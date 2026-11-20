import { randomBytes, scrypt, timingSafeEqual, createHmac } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthUser } from "./auth-user";
import { getPrisma } from "./prisma";

export type { AuthUser } from "./auth-user";

const scryptAsync = promisify(scrypt);
const sessionCookieName = "atelier_session";
const sessionMaxAge = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  role: AuthUser["role"];
  exp: number;
};

function getAuthSecret() {
  return process.env.AUTH_SECRET || "atelier-copies-local-dev-secret";
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || signPayload(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));

    if (
      typeof payload.sub !== "string" ||
      (payload.role !== "CUSTOMER" && payload.role !== "ADMIN") ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) {
    return false;
  }

  const [salt, key] = passwordHash.split(":");

  if (!salt || !key) {
    return false;
  }

  const storedKey = Buffer.from(key, "hex");
  const derivedKey = (await scryptAsync(password, salt, storedKey.length)) as Buffer;

  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export function setSessionCookie(response: NextResponse, user: AuthUser) {
  const token = encodeSession({
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAge,
  });

  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  return token ? decodeSession(token) : null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const prisma = getPrisma();
  const session = await getSessionPayload();

  if (!prisma || !session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      isBlocked: true,
    },
  });

  if (!user || !user.emailVerified || user.isBlocked) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
