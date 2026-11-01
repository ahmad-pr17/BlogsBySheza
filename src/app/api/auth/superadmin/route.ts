import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  createSuperToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SUPER_COOKIE_NAME,
} from "@/lib/auth";
import { clearFails, clientIp, isLocked, passwordMatches, recordFail } from "@/lib/loginGuard";

// Superadmin login (the developer): its own password, SUPERADMIN_PASSWORD.
// It also opens the normal admin session so the admin panel works.
export async function POST(request: Request) {
  const expected = process.env.SUPERADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Superadmin is not set up" }, { status: 503 });
  }

  const ip = clientIp(request);
  if (isLocked(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || !passwordMatches(password, expected)) {
    recordFail(ip);
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  clearFails(ip);

  const cookieStore = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(), opts);
  cookieStore.set(SUPER_COOKIE_NAME, createSuperToken(), opts);

  return NextResponse.json({ success: true });
}
