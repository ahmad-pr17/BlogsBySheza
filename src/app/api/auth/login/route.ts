import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SUPER_COOKIE_NAME,
} from "@/lib/auth";
import { clearFails, clientIp, isLocked, passwordMatches, recordFail } from "@/lib/loginGuard";

// Owner / admin login (the admin panel and the game's Owner entry).
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (isLocked(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || !passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    recordFail(ip);
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  clearFails(ip);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  // An owner login is not a superadmin login: drop any old superadmin mark.
  cookieStore.delete(SUPER_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
