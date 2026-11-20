import { createHash, randomBytes } from "crypto";
import { getPublicOrigin } from "./public-url";

const passwordResetTokenMaxAgeMs = 1000 * 60 * 60;

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + passwordResetTokenMaxAgeMs),
  };
}

export function buildPasswordResetUrl(request: Request, token: string) {
  const baseUrl = getPublicOrigin(request);
  const url = new URL("/auth/reset-password", baseUrl);
  url.searchParams.set("token", token);

  return url.toString();
}
