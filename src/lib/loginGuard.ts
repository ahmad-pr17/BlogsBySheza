import { createHash, timingSafeEqual } from "node:crypto";

// Shared by the owner and superadmin logins: 5 wrong passwords from one address
// locks it out for 10 minutes. (In-memory, so per server instance, but it
// stops casual brute forcing.)
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const fails = new Map<string, { count: number; until: number }>();

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function isLocked(ip: string) {
  const entry = fails.get(ip);
  return !!entry && entry.count >= MAX_FAILS && Date.now() < entry.until;
}

export function recordFail(ip: string) {
  const now = Date.now();
  const entry = fails.get(ip);
  const count = entry && now < entry.until ? entry.count + 1 : 1;
  fails.set(ip, { count, until: now + LOCK_MS });
}

export function clearFails(ip: string) {
  fails.delete(ip);
}

export function passwordMatches(given: string, expected: string | undefined) {
  if (!expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
