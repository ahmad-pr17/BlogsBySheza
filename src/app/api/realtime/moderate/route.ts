import Ably from "ably";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

// Owner / superadmin only: silence a visitor's chat and emotes for a while.
//
// The silence is a message on the "town" channel published by the server with
// the reserved sender "server:mod". Nobody else can use that sender (player
// tokens are bound to their own ids), and every player's browser ignores the
// silenced person until it runs out. minutes = 0 lifts a silence.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = process.env.ABLY_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Multiplayer is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const target = body?.target;
  const minutes = Number(body?.minutes);
  // only visitors can be silenced (never Sheza or the superadmin)
  if (typeof target !== "string" || !/^v:[a-z0-9-]{8,40}$/i.test(target)) {
    return NextResponse.json({ error: "Bad target" }, { status: 400 });
  }
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 60) {
    return NextResponse.json({ error: "Bad duration" }, { status: 400 });
  }

  const rest = new Ably.Rest({ key });
  await rest.channels.get("town").publish({
    name: "mod",
    data: { t: target, ms: Math.round(minutes * 60000) },
    clientId: "server:mod",
  });
  return NextResponse.json({ success: true });
}
