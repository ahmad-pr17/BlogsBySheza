import { createHmac, timingSafeEqual } from "node:crypto";

// Two signed cookies:
//  - sb_session: the owner / admin session (unlocks the admin panel)
//  - sb_super:   the superadmin mark (the developer: flying and so on); a
//                superadmin login also sets sb_session, so the panel works too.
export const SESSION_COOKIE_NAME = "sb_session";
export const SUPER_COOKIE_NAME = "sb_super";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function makeToken(scope: string) {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${sign(scope + expiresAt)}`;
}

function checkToken(scope: string, token: string | undefined | null) {
  if (!token) return false;

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;

  const expectedSignature = sign(scope + expiresAt);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

  return Date.now() < Number(expiresAt);
}

export const createSessionToken = () => makeToken("");
export const isValidSessionToken = (token: string | undefined | null) => checkToken("", token);

export const createSuperToken = () => makeToken("super:");
export const isValidSuperToken = (token: string | undefined | null) => checkToken("super:", token);
