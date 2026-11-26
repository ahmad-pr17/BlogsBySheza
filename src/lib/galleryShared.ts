// Sheza's paintings in the palace. Shared by the server and the browser, so it
// has no database code. Each painting is a tiny pixel-art PNG (a data URL),
// small enough to store in a Setting row and to send over the live channel.
// A painting hangs on the wall of one room, at any spot she chooses.

export const ROOM_IDS = ["home", "kitchen", "living", "bedroom", "study", "ballroom", "gallery"] as const;
export type PaintRoom = (typeof ROOM_IDS)[number];

export const PAINT_W = 56; // pixels in a painting
export const PAINT_H = 44;
export const FRAME_W = 30; // size of a framed painting on the wall (room pixels)
export const FRAME_H = 24;
export const WALL_TOP = 6; // paintings go on the wall: between these two heights
export const WALL_BOTTOM = 62;
export const MAX_PAINTINGS = 24;
const MAX_DATA = 40000; // characters; keeps live messages well under the limit

export type PlacedPainting = {
  id: string;
  room: PaintRoom;
  x: number; // top-left of the frame
  y: number;
  data: string;
  at: number;
};
export type Gallery = PlacedPainting[];

export type GalleryEvent = { op: "put"; painting: PlacedPainting } | { op: "remove"; id: string };

// The showroom ("gallery" room) has 16 ready-made spots: two rows of eight.
export const SHOWROOM_SLOTS: { x: number; y: number }[] = [10, 36].flatMap((y) =>
  Array.from({ length: 8 }, (_, i) => ({ x: 16 + i * 36, y })),
);

export const isPaintId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9]{1,12}$/.test(v);
export const isPaintRoom = (v: unknown): v is PaintRoom => (ROOM_IDS as readonly string[]).includes(v as string);
export const newPaintId = () => Math.random().toString(36).slice(2, 10).padEnd(8, "0");

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
// keep a frame on the wall and inside the room's side walls
export const clampX = (x: number) => Math.round(clamp(x, 16, 304 - FRAME_W));
export const clampY = (y: number) => Math.round(clamp(y, WALL_TOP + 2, WALL_BOTTOM - FRAME_H));

// A painting is accepted only if it is a small PNG data URL on a real room's wall.
export function cleanPlaced(input: unknown, id: string): PlacedPainting | null {
  const p = input as Partial<PlacedPainting> | null;
  if (!p || !isPaintId(id) || !isPaintRoom(p.room)) return null;
  if (typeof p.data !== "string" || p.data.length > MAX_DATA) return null;
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.data)) return null;
  if (typeof p.x !== "number" || typeof p.y !== "number" || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  const at = typeof p.at === "number" && Number.isFinite(p.at) ? p.at : Date.now();
  return { id, room: p.room, x: clampX(p.x), y: clampY(p.y), data: p.data, at };
}
