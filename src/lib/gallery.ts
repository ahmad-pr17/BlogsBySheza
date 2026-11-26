import { prisma } from "@/lib/db";
import {
  cleanPlaced,
  isPaintId,
  MAX_PAINTINGS,
  type Gallery,
  type PlacedPainting,
} from "@/lib/galleryShared";

const PREFIX = "gallery.";

// Where the four original study frames were (paintings saved before rooms existed).
const LEGACY = [
  { x: 18, y: 14 },
  { x: 54, y: 14 },
  { x: 226, y: 14 },
  { x: 262, y: 14 },
];

// Everything that hangs in the palace now.
export async function getGallery(): Promise<Gallery> {
  const out: Gallery = [];
  try {
    const rows = await prisma.setting.findMany({ where: { key: { startsWith: PREFIX } } });
    for (const row of rows) {
      const id = row.key.slice(PREFIX.length);
      if (!isPaintId(id)) continue;
      try {
        const raw = JSON.parse(row.value);
        const legacy = LEGACY[Number(id)];
        const p = cleanPlaced(raw.room ? raw : { ...raw, room: "study", ...legacy }, id);
        if (p) out.push(p);
      } catch {
        /* a bad row is skipped */
      }
    }
  } catch {
    /* no database: empty walls */
  }
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_PAINTINGS);
}

export const countPaintings = () => prisma.setting.count({ where: { key: { startsWith: PREFIX } } });

export async function hasPainting(id: string) {
  return (await prisma.setting.count({ where: { key: PREFIX + id } })) > 0;
}

export async function savePainting(p: PlacedPainting) {
  const { id, ...rest } = p;
  const value = JSON.stringify(rest);
  await prisma.setting.upsert({
    where: { key: PREFIX + id },
    create: { key: PREFIX + id, value },
    update: { value },
  });
}

export async function removePainting(id: string) {
  await prisma.setting.deleteMany({ where: { key: PREFIX + id } });
}
