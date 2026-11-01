import Ably from "ably";
import { NextResponse } from "next/server";
import { isAdminAuthenticated, isSuperAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

// Public. Hands the browser a short-lived Ably token that can only use the
// "town" channel. The real ABLY_API_KEY never leaves the server.
//
// The token's clientId says who the player is: "admin:" = superadmin (the fox),
// "owner:" = Sheza, "v:" = visitor. It is decided here from the signed cookies,
// and Ably stamps every message with that clientId, so nobody can fake a role.
export async function GET(request: Request) {
  const key = process.env.ABLY_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Multiplayer is not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  if (!/^[a-z0-9-]{8,40}$/i.test(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  // A role is granted only if the page asked for it AND the cookie is valid.
  const want = url.searchParams.get("role");
  let prefix = "v";
  if (want === "super" && (await isSuperAuthenticated())) prefix = "admin";
  else if (want === "owner" && (await isAdminAuthenticated())) prefix = "owner";

  const rest = new Ably.Rest({ key });
  const tokenRequest = await rest.auth.createTokenRequest({
    clientId: `${prefix}:${id}`,
    capability: { town: ["publish", "subscribe", "presence"] },
    ttl: 60 * 60 * 1000,
  });

  return NextResponse.json(tokenRequest, {
    headers: { "Cache-Control": "no-store" },
  });
}
