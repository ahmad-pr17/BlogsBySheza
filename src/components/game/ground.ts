import type { Art } from "@/components/game/art";
import { mulberry32 } from "@/components/game/rng";
import { COLS, T, type World } from "@/components/game/world";

// Grass is a separate layer drawn over the dirt/water "base": the grass tiles'
// rounded, transparent edges reveal whatever lies beneath, which is how the
// Sprout Lands tileset is meant to be used. Each 16px tile is assembled from
// four 8px quadrants chosen by its neighbours.

// Quadrant order: 0 TL, 1 TR, 2 BL, 3 BR. Values are tile coords in grass.png.
const CORNER: [number, number][] = [[0, 0], [2, 0], [0, 2], [2, 2]];
const INNER: [number, number][] = [[6, 2], [4, 2], [6, 0], [4, 0]];
const PLAIN: [number, number] = [1, 1];
const VARIANTS: [number, number][] = [
  [0, 5], [1, 5], [2, 5], [0, 6], [1, 6], [2, 6], [5, 5], [5, 6],
];

export type Ground = {
  layer: HTMLCanvasElement;
  needBase: Uint8Array; // grass tile whose edge shows the base layer
  baseWater: Uint8Array; // ...and that base is water (else dirt)
  pebbles: Uint8Array; // path tile uses the pebbly dirt variant
};

export function buildGround(world: World, art: Art): Ground {
  const rows = world.rows;
  const layer = document.createElement("canvas");
  layer.width = COLS * T;
  layer.height = rows * T;
  const ctx = layer.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const needBase = new Uint8Array(COLS * rows);
  const baseWater = new Uint8Array(COLS * rows);
  const pebbles = new Uint8Array(COLS * rows);
  const rand = mulberry32(0x6a5517);

  const kindAt = (c: number, r: number) =>
    c < 0 || r < 0 || c >= COLS || r >= rows ? 0 : world.kind[r * COLS + c];
  const isGrass = (c: number, r: number) => kindAt(c, r) === 0;

  const pick = (q: number, u: boolean, l: boolean, ul: boolean): [number, number] => {
    const top = q < 2;
    const left = q % 2 === 0;
    if (u && l) return ul ? PLAIN : INNER[q];
    if (!u && !l) return CORNER[q];
    if (!u) return top ? [1, 0] : [1, 2];
    return left ? [0, 1] : [2, 1];
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const k = world.kind[i];
      if (k === 1 && rand() < 0.07) pebbles[i] = 1;
      if (k !== 0) continue;

      let edge = false;
      let water = false;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const kk = kindAt(c + dc, r + dr);
          if (kk !== 0) edge = true;
          if (kk === 2) water = true;
        }
      needBase[i] = edge ? 1 : 0;
      baseWater[i] = water ? 1 : 0;

      const src: [number, number][] = [];
      for (let q = 0; q < 4; q++) {
        const dx = q % 2 === 0 ? -1 : 1;
        const dy = q < 2 ? -1 : 1;
        src.push(pick(q, isGrass(c, r + dy), isGrass(c + dx, r), isGrass(c + dx, r + dy)));
      }
      const allPlain = src.every((s) => s[0] === 1 && s[1] === 1);
      if (allPlain && rand() < 0.4) {
        const [vc, vr] = VARIANTS[Math.floor(rand() * VARIANTS.length)];
        ctx.drawImage(art.grass, vc * T, vr * T, T, T, c * T, r * T, T, T);
        continue;
      }
      for (let q = 0; q < 4; q++) {
        const [tc, tr] = src[q];
        const sx = tc * T + (q % 2) * 8;
        const sy = tr * T + Math.floor(q / 2) * 8;
        ctx.drawImage(art.grass, sx, sy, 8, 8, c * T + (q % 2) * 8, r * T + Math.floor(q / 2) * 8, 8, 8);
      }
    }
  }
  return { layer, needBase, baseWater, pebbles };
}
