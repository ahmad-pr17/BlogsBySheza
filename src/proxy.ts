import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasValidSession = isValidSessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (
    pathname.startsWith("/api/posts") ||
    pathname.startsWith("/api/settings")
  ) {
    if (!hasValidSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!hasValidSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/posts",
    "/api/posts/:path*",
    "/api/settings",
    "/api/settings/:path*",
  ],
};
