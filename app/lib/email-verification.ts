import { createHash, randomBytes } from "crypto";
import { getPublicOrigin } from "./public-url";

const emailVerificationTokenMaxAgeMs = 1000 * 60 * 60 * 24;

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createEmailVerificationToken() {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(Date.now() + emailVerificationTokenMaxAgeMs),
  };
}

export function buildEmailVerificationUrl(request: Request, token: string, nextPath = "/") {
  const baseUrl = getPublicOrigin(request);
  const url = new URL("/api/auth/verify-email", baseUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("next", nextPath);

  return url.toString();
}
