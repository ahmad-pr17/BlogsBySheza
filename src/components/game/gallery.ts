import { FRAME_H, FRAME_W, type Gallery } from "@/lib/galleryShared";
import type { RoomId } from "@/components/game/scenes";

// Decoded pictures, kept by their data so a change in one painting does not
// reload all the others.
const cache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(data: string): Promise<HTMLImageElement | null> {
  let p = cache.get(data);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = data;
    });
    cache.set(data, p);
  }
  return p;
}

// Every room's wall with its paintings framed on it. Rooms with no paintings
// are left out (the plain room background is used for them).
export async function composeRooms(
  bases: Record<RoomId, HTMLCanvasElement>,
  gallery: Gallery,
): Promise<Partial<Record<RoomId, HTMLCanvasElement>>> {
  const imgs = await Promise.all(gallery.map((p) => loadImage(p.data)));
  const out: Partial<Record<RoomId, HTMLCanvasElement>> = {};
  for (const room of Object.keys(bases) as RoomId[]) {
    const here = gallery.map((p, i) => ({ p, img: imgs[i] })).filter((e) => e.p.room === room && e.img);
    if (!here.length) continue;
    const base = bases[room];
    const cv = document.createElement("canvas");
    cv.width = base.width;
    cv.height = base.height;
    const c = cv.getContext("2d")!;
    c.drawImage(base, 0, 0);
    for (const { p, img } of here) {
      const { x, y } = p;
      // gold frame with a dark edge, a little shadow, and the picture inside
      c.fillStyle = "rgba(20,12,8,0.3)";
      c.fillRect(x + 1, y + 2, FRAME_W, FRAME_H);
      c.fillStyle = "#3a2a22";
      c.fillRect(x, y, FRAME_W, FRAME_H);
      c.fillStyle = "#c9a02f";
      c.fillRect(x + 1, y + 1, FRAME_W - 2, FRAME_H - 2);
      c.fillStyle = "#f2d675";
      c.fillRect(x + 1, y + 1, FRAME_W - 2, 1);
      c.fillStyle = "#3a2a22";
      c.fillRect(x + 3, y + 3, FRAME_W - 6, FRAME_H - 6);
      c.imageSmoothingEnabled = true;
      c.drawImage(img!, x + 4, y + 4, FRAME_W - 8, FRAME_H - 8);
    }
    out[room] = cv;
  }
  return out;
}
