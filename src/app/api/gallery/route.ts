import Ably from "ably";
import { NextResponse } from "next/server";
import { countPaintings, hasPainting, removePainting, savePainting } from "@/lib/gallery";
import { cleanPlaced, isPaintId, MAX_PAINTINGS, newPaintId, type GalleryEvent } from "@/lib/galleryShared";
import { isAdminAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

// Owner / superadmin only: hang a painting on any wall of the palace (or move
// or replace one), or take one down. Everyone online sees it straight away (a
// message from the reserved sender "server:mod"), everyone else on their next visit.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);

  let event: GalleryEvent;
  if (body?.action === "remove") {
    if (!isPaintId(body.id)) return NextResponse.json({ error: "Bad painting" }, { status: 400 });
    await removePainting(body.id);
    event = { op: "remove", id: body.id };
  } else if (body?.action === "put") {
    const id = isPaintId(body.painting?.id) ? body.painting.id : newPaintId();
    const painting = cleanPlaced({ ...body.painting, at: Date.now() }, id);
    if (!painting) return NextResponse.json({ error: "Bad painting" }, { status: 400 });
    if (!(await hasPainting(id)) && (await countPaintings()) >= MAX_PAINTINGS) {
      return NextResponse.json({ error: "The palace walls are full" }, { status: 409 });
    }
    await savePainting(painting);
    event = { op: "put", painting };
  } else {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const key = process.env.ABLY_API_KEY;
  if (key) {
    try {
      await new Ably.Rest({ key }).channels.get("town").publish({
        name: "gallery",
        data: event,
        clientId: "server:mod",
      });
    } catch {
      /* saved; live players see it on their next visit */
    }
  }
  return NextResponse.json({ success: true, ...event });
}
