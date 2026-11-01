import type { Art, Img } from "@/components/game/art";
import { mulberry32 } from "@/components/game/rng";
import { T, type Interact, type Obj, type World } from "@/components/game/world";

// The Home: one cosy room you can walk around, cook in and sleep in.
// 20 x 15 tiles. Rows 0-3 are the back wall, row 14 the front wall with the
// door, columns 0 and 19 the side walls.

export const HC = 20;
export const HR = 15;
const W = HC * T; // 320
const H = HR * T; // 240

const WINDOWS: [number, number, number, number][] = [
  [46, 12, 32, 32],
  [208, 12, 32, 32],
];
const FIRE_X = 160;
const POT = { x: 256, y: 50 };

export type HomeDrawState = {
  night: boolean;
  cook: number; // 0..1 while cooking, -1 otherwise
  dish: string | null;
  sleeping: boolean;
  heartT: number;
  x: number;
  y: number;
};

export function buildHome(): World {
  const kind = new Uint8Array(HC * HR);
  const blocked = new Uint8Array(HC * HR);
  const objects: Obj[] = [];
  const interacts: Interact[] = [];
  const block = (c: number, r: number) => {
    if (c >= 0 && r >= 0 && c < HC && r < HR) blocked[r * HC + c] = 1;
  };
  for (let r = 0; r < HR; r++)
    for (let c = 0; c < HC; c++)
      if (c === 0 || c === HC - 1 || r <= 3 || r === HR - 1) block(c, r);

  const put = (
    key: string,
    x: number,
    y: number,
    o: { flat?: boolean; lift?: number; interact?: string; block?: [number, number][] } = {},
  ) => {
    objects.push({ key, x, y, flat: o.flat, lift: o.lift, interact: o.interact });
    for (const [c, r] of o.block ?? []) block(c, r);
  };

  // rugs and mats first (flat on the floor)
  put("f_rugSP", 38, 120, { flat: true });
  put("f_rugT", 92, 166, { flat: true });
  put("f_rugG", 240, 170, { flat: true });
  put("cushion", 170, 112, { flat: true });
  put("mat", 160, 222, { flat: true });

  // bedroom
  put("f_bedP", 36, 96, { interact: "bed", block: [[1, 4], [1, 5], [2, 4], [2, 5]] });
  put("f_dresser", 62, 80, { block: [[3, 4], [4, 4]] });
  put("f_lampP", 62, 80.2, { lift: 14 });

  // books, hearth, cat
  put("shelf", 104, 80, { interact: "books", block: [[5, 4], [6, 4], [7, 4]] });
  for (const c of [8, 9, 10, 11]) block(c, 4);
  put("cat", 168, 110, { interact: "cat", block: [[10, 6]] });

  // kitchen
  put("counter", 224, 80, { block: [[13, 4], [14, 4]] });
  put("stove", 256, 80, { interact: "stove", block: [[15, 4], [16, 4]] });
  put("counterSink", 288, 80, { block: [[17, 4], [18, 4]] });

  // dining
  put("f_table", 240, 152, { interact: "table", block: [[14, 9], [15, 9]] });
  put("f_chairR", 221, 153, { block: [[13, 9]] });
  put("f_chairL", 259, 153, { block: [[16, 9]] });
  put("f_lampG", 234, 152.2, { lift: 12 });

  // reading nook
  put("f_chairR", 70, 168, { block: [[4, 10]] });
  put("f_chairL", 114, 168, { block: [[7, 10]] });
  put("f_stool", 92, 166, { block: [[5, 10]] });
  put("f_plantB", 92, 166.2, { lift: 9 });

  // greenery and light
  put("f_sunflower", 27, 214, { block: [[1, 13]] });
  put("f_plantA", 294, 214, { block: [[18, 13]] });
  put("lamp", 291, 150, { block: [[18, 9]] });

  objects.sort((a, b) => a.y - b.y);

  interacts.push(
    {
      id: "h:bed", kind: "act", act: "sleep", label: "Bed", verb: "Sleep in the bed",
      signX: 36, signY: 96, spotX: 36, spotY: 112, hitDy: 10, hitR: 20,
    },
    {
      id: "h:stove", kind: "act", act: "cook", label: "Stove", verb: "Cook something",
      signX: 256, signY: 80, spotX: 256, spotY: 98, hitDy: 12, hitR: 22,
    },
    {
      id: "h:table", kind: "act", act: "eat", label: "Table", verb: "Sit down and eat",
      signX: 240, signY: 152, spotX: 240, spotY: 172, hitDy: 6, hitR: 20,
    },
    {
      id: "h:cat", kind: "act", act: "pet", label: "Cat", verb: "Pet the cat",
      signX: 168, signY: 110, spotX: 168, spotY: 126, hitDy: 4, hitR: 14,
    },
    {
      id: "h:books", kind: "act", act: "books", label: "Bookshelf", verb: "Browse the books",
      signX: 104, signY: 80, spotX: 104, spotY: 98, hitDy: 14, hitR: 22,
    },
    {
      id: "h:door", kind: "act", act: "leave", label: "Door", verb: "Go outside",
      signX: 160, signY: 222, spotX: 160, spotY: 210, hitDy: 4, hitR: 22,
    },
  );

  return {
    cols: HC,
    rows: HR,
    w: W,
    h: H,
    kind,
    blocked,
    objects,
    interacts,
    start: { x: 160, y: 198 },
  };
}

// ---------------------------------------------------------------- static room
type Ctx = CanvasRenderingContext2D;
const R = (c: Ctx, col: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

export function buildHomeBg(art: Art): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const rand = mulberry32(0x40e5);
  const spr = (k: string) => art.sprites[k] as Img;

  // ---- floor: staggered planks ----
  c.save();
  c.beginPath();
  c.rect(16, 64, 288, 160);
  c.clip();
  const tones = ["#d9a468", "#cf9a5f", "#c8925a", "#d3a06a"];
  for (let row = 0, y = 64; y < 224; y += 8, row++) {
    const off = (row * 13) % 32;
    for (let x = 16 - off; x < 304; x += 32) {
      R(c, tones[Math.floor(rand() * tones.length)], x, y, 32, 8);
      R(c, "rgba(255,240,200,0.25)", x, y, 32, 1);
      R(c, "#a87548", x + 31, y, 1, 8);
      R(c, "#b98350", x, y + 7, 32, 1);
      if (rand() < 0.3) R(c, "#b58050", x + 4 + Math.floor(rand() * 20), y + 3, 2, 1);
    }
  }
  c.restore();
  // soft shadows where the floor meets the walls
  for (let i = 0; i < 6; i++) R(c, `rgba(60,30,15,${0.2 - i * 0.03})`, 16, 64 + i, 288, 1);
  for (let i = 0; i < 4; i++) {
    R(c, `rgba(60,30,15,${0.16 - i * 0.04})`, 16 + i, 64, 1, 160);
    R(c, `rgba(60,30,15,${0.16 - i * 0.04})`, 303 - i, 64, 1, 160);
  }

  // ---- back wall ----
  R(c, "#efdaac", 0, 0, W, 64);
  for (let x = 0; x < W; x += 8) R(c, "#e6cd9b", x, 6, 1, 40);
  // wainscot
  R(c, "#b9845e", 0, 46, W, 18);
  for (let x = 4; x < W; x += 24) {
    R(c, "#a3714f", x, 50, 20, 11);
    R(c, "#c99a72", x + 1, 51, 18, 9);
  }
  R(c, "#d4a373", 0, 46, W, 1);
  R(c, "#8a5f45", 0, 47, W, 2);
  R(c, "#795e53", 0, 62, W, 2);
  // ceiling beam
  R(c, "#6b4532", 0, 0, W, 6);
  R(c, "#956a52", 0, 0, W, 1);
  R(c, "#4f3224", 0, 5, W, 1);
  for (const bx of [48, 112, 176, 240]) {
    R(c, "#6b4532", bx, 6, 4, 4);
    R(c, "#4f3224", bx + 3, 6, 1, 4);
  }

  // ---- side walls and the front wall ----
  for (const sx of [0, 304]) {
    R(c, "#8a5f45", sx, 0, 16, 224);
    for (let x = sx; x < sx + 16; x += 8) R(c, "#74503a", x + 7, 0, 1, 224);
    R(c, "rgba(255,230,190,0.2)", sx + (sx === 0 ? 0 : 15), 0, 1, 224);
  }
  R(c, "#7c5239", 0, 224, W, 16);
  R(c, "#a37552", 0, 224, W, 1);
  R(c, "#5f3d2b", 0, 238, W, 2);
  // doorway
  R(c, "#4a2f22", 142, 218, 36, 22);
  R(c, "#f1e3b4", 145, 224, 30, 16);
  R(c, "#ffffff", 147, 226, 8, 2);
  R(c, "#c9b98e", 145, 236, 30, 4);
  R(c, "#4a2f22", 142, 218, 3, 22);
  R(c, "#4a2f22", 175, 218, 3, 22);
  R(c, "#795e53", 142, 217, 36, 3);

  // ---- windows (left transparent so the sky shows through) ----
  for (const [x, y, w, h] of WINDOWS) {
    c.clearRect(x, y, w, h);
    R(c, "#795e53", x - 3, y - 3, w + 6, 3);
    R(c, "#795e53", x - 3, y + h, w + 6, 3);
    R(c, "#795e53", x - 3, y, 3, h);
    R(c, "#795e53", x + w, y, 3, h);
    R(c, "#d4a373", x - 3, y - 3, w + 6, 1);
    R(c, "#9b6a4a", x - 5, y + h + 3, w + 10, 2);
    R(c, "#795e53", x + w / 2 - 1, y, 2, h);
    R(c, "#795e53", x, y + h / 2 - 1, w, 2);
    // glass shine
    R(c, "rgba(255,255,255,0.35)", x + 3, y + 3, 2, 8);
    R(c, "rgba(255,255,255,0.25)", x + 6, y + 3, 1, 4);
    // curtains + valance
    for (const side of [0, 1]) {
      const cx = side === 0 ? x - 3 : x + w - 5;
      R(c, "#d99aa0", cx, y - 2, 8, h + 5);
      R(c, "#bd757e", cx + 2, y - 2, 1, h + 5);
      R(c, "#bd757e", cx + 5, y - 2, 1, h + 5);
      R(c, "#a35b70", cx + (side === 0 ? 5 : 2), y + h / 2, 3, 2);
    }
    R(c, "#bd757e", x - 6, y - 6, w + 12, 4);
    for (let sx = x - 6; sx < x + w + 6; sx += 4) R(c, "#a35b70", sx + 3, y - 2, 1, 2);
  }

  // ---- fireplace ----
  R(c, "#7b756d", 130, 20, 60, 44);
  for (let y = 24, row = 0; y < 64; y += 6, row++) {
    R(c, "#68625b", 130, y, 60, 1);
    for (let x = 130 + (row % 2) * 6; x < 190; x += 12) R(c, "#68625b", x, y, 1, 6);
  }
  R(c, "#948d83", 130, 20, 60, 1);
  R(c, "#6b4532", 124, 20, 72, 6);
  R(c, "#a97a58", 124, 20, 72, 2);
  R(c, "#4f3224", 124, 25, 72, 1);
  // candles on the mantle
  for (const cx of [134, 182]) {
    R(c, "#fff1c9", cx, 15, 3, 5);
    R(c, "#e8b66a", cx, 19, 3, 1);
  }
  // opening
  R(c, "#2a1812", 142, 34, 36, 30);
  R(c, "#7b756d", 142, 34, 4, 3);
  R(c, "#7b756d", 174, 34, 4, 3);
  R(c, "#1a0f0b", 146, 37, 28, 27);
  // hearth stone
  R(c, "#d1cabb", 124, 64, 72, 1);
  R(c, "#b0a99c", 124, 65, 72, 7);
  R(c, "#8e877b", 124, 72, 72, 2);
  for (let x = 130; x < 196; x += 14) R(c, "#8e877b", x, 65, 1, 7);

  // ---- shelf of jars above the kitchen ----
  R(c, "#6b4532", 244, 32, 58, 3);
  R(c, "#a97a58", 244, 32, 58, 1);
  R(c, "#4f3224", 248, 35, 2, 3);
  R(c, "#4f3224", 296, 35, 2, 3);
  const jars = ["#bd757e", "#78a158", "#e8b66a", "#7180b1", "#d79e61"];
  jars.forEach((col, i) => {
    const jx = 247 + i * 11;
    R(c, "#4a2f22", jx, 24, 7, 8);
    R(c, col, jx + 1, 25, 5, 6);
    R(c, "rgba(255,255,255,0.45)", jx + 1, 25, 1, 5);
    R(c, "#795e53", jx + 1, 22, 5, 2);
  });
  // hanging pan beside the window
  R(c, "#353738", 246, 16, 2, 2);
  R(c, "#5f6465", 244, 18, 6, 6);
  R(c, "#353738", 245, 19, 4, 4);

  // ---- art on the walls ----
  const paint = spr("f_paint0");
  c.drawImage(paint, 29, 30);
  c.drawImage(spr("f_clockBear"), 98, 12);
  c.drawImage(spr("f_paint2"), 154, 6);

  return cv;
}

// ------------------------------------------------------------------- per frame
function sky(c: Ctx, night: boolean, t: number) {
  WINDOWS.forEach(([x, y, w, h], i) => {
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    if (night) {
      R(c, "#1b2250", x, y, w, h);
      R(c, "#2a3570", x, y + h / 2, w, h / 2);
      R(c, "#3b4890", x, y + h - 6, w, 6);
      for (let s = 0; s < 7; s++) {
        const sx = x + 3 + ((s * 11 + i * 5) % (w - 6));
        const sy = y + 3 + ((s * 7 + i * 3) % (h - 12));
        R(c, Math.sin(t * 2 + s * 1.7) > 0 ? "#fff9d6" : "#9aa5d8", sx, sy, 1, 1);
      }
      if (i === 0) {
        c.fillStyle = "#f7ebaa";
        c.beginPath();
        c.arc(x + 22, y + 10, 6, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#2a3570";
        c.beginPath();
        c.arc(x + 25, y + 8, 5, 0, Math.PI * 2);
        c.fill();
      }
    } else {
      R(c, "#8fd0ee", x, y, w, h);
      R(c, "#a9ddf2", x, y + 10, w, 10);
      R(c, "#c9ecf4", x, y + 20, w, h - 20);
      R(c, "#78a158", x, y + h - 5, w, 5);
      R(c, "#8fb54f", x, y + h - 5, w, 1);
      // a drifting cloud
      const cx = x - 14 + ((t * 2.5 + i * 22) % (w + 28));
      R(c, "#ffffff", cx, y + 6, 12, 4);
      R(c, "#ffffff", cx + 3, y + 4, 6, 3);
      R(c, "#e8f6fa", cx, y + 9, 12, 1);
    }
    c.restore();
  });
}

function zGlyph(c: Ctx, x: number, y: number, s: number, col: string) {
  R(c, col, x, y, s, 1);
  for (let i = 0; i < s; i++) R(c, col, x + s - 1 - i, y + i, 1, 1);
  R(c, col, x, y + s - 1, s, 1);
}

export function drawHomeScene(
  c: Ctx,
  art: Art,
  bg: HTMLCanvasElement,
  world: World,
  s: HomeDrawState,
  t: number,
  actors: { y: number; draw: () => void }[], // players, sorted by y
) {
  // sky behind the wall, then the room
  sky(c, s.night, t);
  c.drawImage(bg, 0, 0);

  // sunbeams across the floor
  if (!s.night) {
    c.fillStyle = `rgba(255,244,200,${0.1 + Math.sin(t * 0.6) * 0.02})`;
    for (const sx of [46, 208]) {
      c.beginPath();
      c.moveTo(sx + 2, 64);
      c.lineTo(sx + 30, 64);
      c.lineTo(sx + 92, 176);
      c.lineTo(sx + 40, 176);
      c.fill();
    }
    // dust motes drifting in the light
    for (let i = 0; i < 12; i++) {
      const mx = 50 + ((i * 37) % 220) + Math.sin(t * 0.5 + i) * 4;
      const my = 70 + ((i * 53 + t * 4) % 100);
      R(c, `rgba(255,255,230,${0.35 + Math.sin(t + i) * 0.2})`, Math.round(mx), Math.round(my), 1, 1);
    }
  }

  // fire in the hearth
  {
    const base = 62;
    R(c, "#4f3224", FIRE_X - 12, base - 3, 24, 3);
    R(c, "#795e53", FIRE_X - 10, base - 5, 20, 3);
    for (let row = 0; row < 15; row++) {
      const wob = Math.sin(t * 8 + row * 0.9) * 1.2;
      const w = Math.max(2, Math.round(16 * (1 - row / 17)));
      const col = row < 4 ? "#f7e07a" : row < 9 ? "#f0a23a" : "#d9503a";
      R(c, col, Math.round(FIRE_X - w / 2 + wob), base - 5 - row, w, 1);
    }
    R(c, "#fff9d6", FIRE_X - 2, base - 9, 4, 4);
  }

  // flat things first
  const spriteOf = (o: Obj): Img => {
    if (o.key === "cat") return art.sprites[Math.floor(t * 1.3) % 2 ? "cat1" : "cat0"] as Img;
    const sp = art.sprites[o.key];
    return (Array.isArray(sp) ? sp[0] : sp) as Img;
  };
  const drawObj = (o: Obj) => {
    const sp = spriteOf(o);
    c.drawImage(sp, Math.round(o.x - sp.width / 2), Math.round(o.y - sp.height - (o.lift ?? 0)));
  };
  for (const o of world.objects) if (o.flat) drawObj(o);

  // furniture and the players, back to front
  let ai = 0;
  for (const o of world.objects) {
    if (o.flat) continue;
    while (ai < actors.length && o.y > actors[ai].y) actors[ai++].draw();
    drawObj(o);
    if (o.key === "f_table" && s.dish) {
      const d = art.sprites[s.dish] as Img;
      c.drawImage(d, 243, 152 - d.height - 7);
    }
  }
  while (ai < actors.length) actors[ai++].draw();

  // someone asleep in the bed
  if (s.sleeping) {
    R(c, "#6b4a32", 31, 76, 10, 5);
    R(c, "#f2c9a0", 33, 81, 6, 4);
    R(c, "#bd757e", 29, 85, 14, 9);
    R(c, "#d99aa0", 29, 85, 14, 2);
    for (let i = 0; i < 3; i++) {
      const age = (t * 9 + i * 8) % 26;
      zGlyph(c, 46 + i * 4, Math.round(72 - age), 3 + i, `rgba(255,255,255,${1 - age / 26})`);
    }
  }

  // steam and bubbles while cooking
  if (s.cook >= 0) {
    for (let i = 0; i < 7; i++) {
      const age = (t * 16 + i * 6) % 30;
      const sx = POT.x + Math.sin(t * 2.2 + i * 1.9) * 3 + (i - 3);
      R(c, `rgba(255,255,255,${0.75 - age / 40})`, Math.round(sx), Math.round(POT.y - age), 2 + (i % 2), 2);
    }
    for (let i = 0; i < 3; i++) {
      if (Math.sin(t * 7 + i * 2.3) > 0.2) R(c, "#f7ebaa", POT.x - 5 + i * 5, POT.y + 3 + (i % 2), 2, 1);
    }
  }

  // a heart over the cat
  const ha = t - s.heartT;
  if (ha >= 0 && ha < 1.6) {
    const hy = 90 - ha * 12;
    const col = `rgba(217,74,100,${1 - ha / 1.6})`;
    R(c, col, 166, Math.round(hy), 2, 2);
    R(c, col, 170, Math.round(hy), 2, 2);
    R(c, col, 165, Math.round(hy) + 1, 8, 2);
    R(c, col, 166, Math.round(hy) + 3, 6, 1);
    R(c, col, 168, Math.round(hy) + 4, 2, 1);
  }

  // ---- light: a soft vignette by day, lamplight and firelight by night ----
  const vg = c.createRadialGradient(W / 2, H / 2 + 10, 60, W / 2, H / 2 + 10, 210);
  vg.addColorStop(0, "rgba(40,20,10,0)");
  vg.addColorStop(1, s.night ? "rgba(10,10,40,0.35)" : "rgba(40,20,10,0.22)");
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);

  const glow = (x: number, y: number, r: number, a: number, rgb = "255,196,110") => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  };
  if (s.night) {
    c.fillStyle = "rgba(14,20,66,0.4)";
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "lighter";
    glow(FIRE_X, 70, 90, 0.42 + Math.sin(t * 9) * 0.04);
    glow(62, 70, 48, 0.3);
    glow(234, 146, 46, 0.3);
    glow(291, 126, 52, 0.3);
    glow(62, 30, 40, 0.1, "140,160,255");
    glow(224, 30, 40, 0.1, "140,160,255");
    c.globalCompositeOperation = "source-over";
  } else {
    c.globalCompositeOperation = "lighter";
    glow(FIRE_X, 70, 56, 0.16);
    c.globalCompositeOperation = "source-over";
  }
  if (s.cook >= 0) {
    c.globalCompositeOperation = "lighter";
    glow(256, 90, 40, 0.3 + Math.sin(t * 11) * 0.05, "255,150,70");
    c.globalCompositeOperation = "source-over";
  }
}
