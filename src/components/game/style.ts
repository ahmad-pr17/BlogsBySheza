import type { Img } from "@/components/game/art";

// Sheza's wardrobe: dresses and hairstyles drawn over the farmer character.
// The farmer is a chibi about 22 px tall (a big bushy head, a small body), so
// the dresses are small pixel shapes laid over the body, measured from the
// feet (py): the chin is about py-8, the waist py-5, the hem py.

type Ctx = CanvasRenderingContext2D;

export type Style = { outfit: number; hairStyle: number; hairColor: number };
export const DEFAULT_STYLE: Style = { outfit: 0, hairStyle: 0, hairColor: 0 };
const KEY = "trail-style";

// ----------------------------------------------------------------- dresses
type Pal = { main: string; light: string; shade: string; trim: string; glint: string };
export type Outfit = {
  name: string;
  long: boolean; // a gown to the floor (else a short frock)
  pal: Pal;
  pat?: "stars" | "floral" | "dots";
  sparkle?: "gold" | "white" | "prism" | "silver" | "blue";
  rainbow?: boolean;
};

const none: Pal = { main: "#fff", light: "#fff", shade: "#fff", trim: "#fff", glint: "#fff" };

export const OUTFITS: Outfit[] = [
  { name: "Farmer clothes", long: false, pal: none },
  { name: "Rose gown", long: true, pal: { main: "#f08cb0", light: "#f9b4cf", shade: "#c96a90", trim: "#f6c453", glint: "#fff7c8" }, sparkle: "gold" },
  { name: "Diamond gown", long: true, pal: { main: "#eef3fb", light: "#ffffff", shade: "#c3d0e6", trim: "#9fb2d6", glint: "#ffffff" }, sparkle: "prism" },
  { name: "Golden gown", long: true, pal: { main: "#f6cf3f", light: "#fde98a", shade: "#d9a622", trim: "#fff1a8", glint: "#fff8d0" }, sparkle: "gold" },
  { name: "Sapphire gown", long: true, pal: { main: "#3d6fd8", light: "#6f9af0", shade: "#2a4fa8", trim: "#c7dcff", glint: "#e6f0ff" }, sparkle: "blue" },
  { name: "Amethyst gown", long: true, pal: { main: "#8e5fd0", light: "#b58af0", shade: "#6a3fa8", trim: "#f0d9ff", glint: "#f6e8ff" }, sparkle: "white" },
  { name: "Ruby gown", long: true, pal: { main: "#d0384a", light: "#f06a78", shade: "#a02334", trim: "#ffd0a0", glint: "#ffe3e3" }, sparkle: "white" },
  { name: "Emerald gown", long: true, pal: { main: "#2fa86a", light: "#5fd090", shade: "#1f7f4f", trim: "#e8ffd0", glint: "#eafff0" }, sparkle: "white" },
  { name: "Starry night gown", long: true, pal: { main: "#26307a", light: "#3a46a0", shade: "#1a2058", trim: "#f6cf3f", glint: "#fff3b0" }, pat: "stars", sparkle: "gold" },
  { name: "Midnight silver gown", long: true, pal: { main: "#2c2c3e", light: "#454560", shade: "#1c1c2a", trim: "#c9ced8", glint: "#ffffff" }, sparkle: "silver" },
  { name: "Rainbow sparkle gown", long: true, pal: none, rainbow: true, sparkle: "prism" },
  { name: "Sunflower frock", long: false, pal: { main: "#f6d44a", light: "#fbe98a", shade: "#d9a622", trim: "#78a158", glint: "#fff" }, pat: "floral" },
  { name: "Blue floral frock", long: false, pal: { main: "#7fb7e8", light: "#a9d3f2", shade: "#5f94c6", trim: "#ffffff", glint: "#fff" }, pat: "floral" },
  { name: "Strawberry frock", long: false, pal: { main: "#e0566a", light: "#f58a98", shade: "#b83a4e", trim: "#ffffff", glint: "#fff" }, pat: "dots" },
  { name: "Mint frock", long: false, pal: { main: "#8fdcc0", light: "#bff0de", shade: "#62b89c", trim: "#ffffff", glint: "#fff" }, pat: "dots" },
];

// A small colour for each dress (for the picker).
export function outfitSwatch(i: number) {
  const o = OUTFITS[i];
  return o?.rainbow ? "#f08cb0" : (o?.pal.main ?? "#ccc");
}

function hsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

const GLINT: Record<NonNullable<Outfit["sparkle"]>, string[]> = {
  gold: ["#fff6c4", "#ffe27a"],
  white: ["#ffffff", "#f4f0ff"],
  prism: ["#ffffff", "#bfe9ff", "#ffd0f0", "#fff3b0"],
  silver: ["#ffffff", "#c9ced8"],
  blue: ["#ffffff", "#bcd8ff"],
};

// The farmer sprite is a 16 x 32 cell. These numbers were measured from the
// pixels (all in cell coordinates, so every dress and hairstyle is placed
// exactly on the body, direction by direction and frame by frame).
//   dir: 0 up, 1 up-right, 2 right, 3 down-right, 4 down, 5 down-left, 6 left, 7 up-left
const SHIRT_X: [number, number][] = [[4, 10], [5, 10], [7, 9], [5, 9], [4, 10], [5, 9], [5, 7], [4, 9]];
const HEAD_CX = [7, 8, 8, 8, 7, 7, 7, 6]; // the middle of the head
// the top of the hair, by sprite row (0 and 2 are the two steps, 1 standing)
const HAIR_TOP = [
  [10, 10, 10, 10, 9, 8, 8, 9],
  [11, 11, 11, 11, 10, 9, 9, 10],
  [10, 10, 10, 10, 9, 8, 8, 9],
];
const isBack = (d: number) => d === 0 || d === 1 || d === 7;
const isFront = (d: number) => d === 3 || d === 4 || d === 5;

// Where the top of the hair is on screen, and its middle (for crowns).
export function headAnchor(px: number, py: number, dir: number, row: number) {
  return { x: px - 8 + HEAD_CX[dir], y: py - 30 + HAIR_TOP[row][dir] };
}

// Draw a dress over the body. py is where the feet are (the sprite's bottom).
// `flare` > 0 makes the skirt swirl wide (for the princess dance).
export function drawOutfit(ctx: Ctx, o: Outfit, px: number, py: number, dir: number, row: number, t: number, walk: boolean, flare = 0) {
  const p: Pal = o.rainbow
    ? { main: hsl((t * 60) % 360, 0.75, 0.62), light: hsl((t * 60 + 20) % 360, 0.8, 0.78), shade: hsl((t * 60 - 25 + 360) % 360, 0.7, 0.48), trim: "#fff3b0", glint: "#fff" }
    : o.pal;
  const ox = px - 8;
  const oy = py - 30;
  const R = (cx: number, cy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + cx, oy + cy, w, h);
  };
  const [x0, x1] = SHIRT_X[dir];
  const back = isBack(dir);
  const side = dir === 2 || dir === 6;
  const bob = row === 1 ? 0 : -1; // the body is one pixel higher on the step frames
  const mid = (x0 + x1) / 2;
  const sway = walk ? Math.round(Math.sin(t * 14)) : 0;

  // bodice: exactly over the shirt (collar row, then the full chest)
  const top = 23 + bob;
  for (let r = 0; r < 4; r++) {
    const inset = r === 0 && x1 - x0 >= 4 ? 1 : 0;
    const a = x0 + inset;
    const b = x1 - inset;
    R(a, top + r, b - a + 1, 1, p.main);
    R(a, top + r, 1, 1, p.light);
    R(b, top + r, 1, 1, p.shade);
  }
  if (!back && !side) R(Math.round(mid), top, 1, 1, "#e8cfa6"); // a little neckline
  // short puffed sleeves over the shoulders (front and back only)
  if (!side) {
    R(x0 - 1, top + 1, 1, 1, p.light);
    R(x1 + 1, top + 1, 1, 1, p.shade);
  }
  // the sash at the waist
  R(x0, top + 3, x1 - x0 + 1, 1, p.trim);

  // skirt: flares from the waist to the hem
  const ball = flare > 0;
  const rows = o.long ? 30 - (top + 4) + 1 : 2;
  const wide = side ? 0.72 : dir === 1 || dir === 3 || dir === 5 || dir === 7 ? 0.88 : 1;
  const baseHW = (x1 - x0 + 1) / 2;
  const hemHW = (ball ? (o.long ? Math.max(5.5, flare) : Math.min(5, flare * 0.55 + 2)) : o.long ? 5.5 : 4.5) * wide;
  let lastL = x0;
  let lastR = x1;
  for (let r = 0; r < rows; r++) {
    const f = (r + 1) / rows;
    const hw = baseHW + (Math.max(hemHW, baseHW) - baseHW) * f;
    const a = Math.round(mid + 0.5 - hw) + (r >= 1 ? sway * (r > 1 ? 1 : 0) : 0);
    const b = Math.round(mid + 0.5 + hw) - 1 + (r >= 1 ? sway * (r > 1 ? 1 : 0) : 0);
    const y = top + 4 + r;
    R(a, y, b - a + 1, 1, p.main);
    R(a, y, 1, 1, p.light);
    R(b, y, 1, 1, p.shade);
    if (b - a > 6) {
      R(a + 1, y, 1, 1, p.light);
      R(b - 1, y, 1, 1, p.shade);
    }
    if (r % 2 === 1 && b - a > 5) {
      R(Math.round(mid) - 2, y, 1, 1, p.shade);
      R(Math.round(mid) + 2, y, 1, 1, p.light);
    }
    if (r === rows - 1) {
      // a scalloped hem (trim and dress colour alternating)
      for (let x = a; x <= b; x++) if ((x - a) % 2 === 0) R(x, y, 1, 1, p.trim);
    }
    lastL = a;
    lastR = b;
  }
  if (back) {
    // a bow at the back of the waist
    const m = Math.round(mid);
    R(m - 2, top + 2, 5, 2, p.trim);
    R(m - 3, top + 4, 2, 2, p.trim);
    R(m + 2, top + 4, 2, 2, p.trim);
  }
  // patterns
  const pick = (list: [number, number][]) => list.map(([dx, dy]) => [Math.round(mid + (dx * (x1 - x0 + 1)) / 7), top + 3 + dy] as [number, number]);
  if (o.pat === "floral") {
    for (const [fx, fy] of pick([[-2, 2], [2, 3], [0, 1], [3, 0], [-3, 0]])) {
      R(fx, fy, 1, 1, "#ffffff");
      R(fx, fy - 1, 1, 1, "#f08cb0");
    }
  } else if (o.pat === "dots") {
    for (const [fx, fy] of pick([[-2, 2], [1, 3], [3, 1], [-1, 1], [-3, 0], [2, 0]])) R(fx, fy, 1, 1, "#ffffff");
  } else if (o.pat === "stars") {
    for (const [fx, fy] of pick([[-3, 1], [2, 2], [0, 3], [3, 0], [-2, 3], [1, 0]])) R(fx, fy, 1, 1, "#fff3b0");
  }
  // glittering glints over the bodice and skirt
  if (o.sparkle) {
    const cols = GLINT[o.sparkle];
    const n = ball ? 12 : 9;
    for (let i = 0; i < n; i++) {
      const gy = top + ((i * 5) % (rows + 3));
      const spanL = gy >= top + 4 ? lastL : x0;
      const spanR = gy >= top + 4 ? lastR : x1;
      const gx = spanL + ((i * 7 + 3) % (spanR - spanL + 1));
      const v = Math.sin(t * 3.1 + i * 2.3);
      if (v < 0.35) continue;
      const c = cols[(i + Math.floor(t * 2)) % cols.length];
      R(gx, gy, 1, 1, c);
      if (v > 0.82) {
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(ox + gx - 1, oy + gy, 3, 1);
        ctx.fillRect(ox + gx, oy + gy - 1, 1, 3);
        ctx.globalAlpha = 1;
      }
    }
  }
}

// --------------------------------------------------------------------- hair
export const HAIR_STYLES = ["Original", "Long", "Braids", "Ponytail", "Bun", "Bob", "Pigtails"];

export const HAIR_COLORS: { name: string; base: string; light: string; shade: string }[] = [
  { name: "Brown", base: "#8c7369", light: "#9d866f", shade: "#7b6762" }, // the original colours
  { name: "Black", base: "#3f3848", light: "#58506a", shade: "#2c2733" },
  { name: "Blonde", base: "#e8c76a", light: "#f8dd90", shade: "#c9a24a" },
  { name: "Red", base: "#c0532f", light: "#dd7445", shade: "#9a3f24" },
  { name: "Pink", base: "#e88aae", light: "#f7aac8", shade: "#c96a90" },
  { name: "Blue", base: "#5a7fd0", light: "#7d9eea", shade: "#4562b0" },
  { name: "Lavender", base: "#9d84d8", light: "#bba5f0", shade: "#7e66b8" },
  { name: "Silver", base: "#c9ced8", light: "#e6eaf1", shade: "#a0a7b4" },
  { name: "Chestnut", base: "#a8603a", light: "#c27a4e", shade: "#864a2a" },
];

const hexToRgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

// The character sheet with its brown hair recoloured (cached per sheet).
const sheets = new WeakMap<object, Map<number, Img>>();
export function hairSheet(base: Img, colour: number): Img {
  if (colour <= 0 || !HAIR_COLORS[colour]) return base;
  let per = sheets.get(base);
  if (!per) {
    per = new Map();
    sheets.set(base, per);
  }
  const hit = per.get(colour);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = base.width;
  cv.height = base.height;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.drawImage(base, 0, 0);
  const data = c.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  const from = [HAIR_COLORS[0].base, HAIR_COLORS[0].light, HAIR_COLORS[0].shade].map(hexToRgb);
  const to = [HAIR_COLORS[colour].base, HAIR_COLORS[colour].light, HAIR_COLORS[colour].shade].map(hexToRgb);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    for (let k = 0; k < 3; k++) {
      if (d[i] === from[k][0] && d[i + 1] === from[k][1] && d[i + 2] === from[k][2]) {
        d[i] = to[k][0];
        d[i + 1] = to[k][1];
        d[i + 2] = to[k][2];
        break;
      }
    }
  }
  c.putImageData(data, 0, 0);
  per.set(colour, cv);
  return cv;
}

// The extra hair (long locks, braids, a ponytail, a bun...) drawn over the body,
// placed from the measured head and body positions.
export function drawHairExtras(ctx: Ctx, px: number, py: number, dir: number, row: number, style: number, colour: number, t: number, walk: boolean) {
  if (style <= 0) return;
  const pal = HAIR_COLORS[colour] ?? HAIR_COLORS[0];
  const ox = px - 8;
  const oy = py - 30;
  const R = (cx: number, cy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + cx, oy + cy, w, h);
  };
  const back = isBack(dir);
  const front = isFront(dir);
  const right = dir === 2; // facing right: the back of the head is on the left
  const hx = HEAD_CX[dir];
  const ht = HAIR_TOP[row][dir];
  const bob = row === 1 ? 0 : -1;
  const sway = walk ? Math.round(Math.sin(t * 11) * 1.2) : Math.round(Math.sin(t * 1.4) * 0.6);
  const ribbon = "#ff9ec0";
  // a hanging lock: x, y, width, length (narrowing at the tip), sideways drift
  const lock = (x: number, y: number, w: number, len: number, drift = 0) => {
    for (let r = 0; r < len; r++) {
      const ww = r >= len - 2 ? Math.max(1, w - 1) : w;
      const sx = x + Math.round((drift * r) / len);
      R(sx, y + r, ww, 1, pal.base);
      R(sx, y + r, 1, 1, pal.light);
      R(sx + ww - 1, y + r, 1, 1, pal.shade);
    }
  };
  const braid = (x: number, y: number, len: number) => {
    for (let r = 0; r < len; r++) {
      const c = Math.floor(r / 2) % 2 ? pal.shade : pal.base;
      R(x + (r % 4 < 2 ? 0 : 1), y + r, 2, 1, c);
      R(x + (r % 4 < 2 ? 0 : 1), y + r, 1, 1, pal.light);
    }
    R(x, y + len, 3, 2, ribbon);
  };
  const body = 23 + bob; // the top of the shoulders

  if (style === 1) {
    // long hair
    if (front) {
      lock(hx - 7, ht + 9, 2, 9, -sway);
      lock(hx + 6, ht + 9, 2, 9, sway);
    } else if (back) {
      for (let r = 0; r < 6; r++) {
        const hw = r < 3 ? 4 : 3;
        const sx = hx - hw + (r > 2 ? sway : 0);
        R(sx, body + r, hw * 2 + 1, 1, pal.base);
        R(sx, body + r, 2, 1, pal.light);
        R(sx + hw * 2 - 1, body + r, 2, 1, pal.shade);
        if (r % 2 === 1) R(hx + (r > 2 ? sway : 0), body + r, 1, 1, pal.shade);
      }
    } else {
      lock(right ? hx - 6 : hx + 2, ht + 9, 4, 11, right ? -sway : sway);
    }
  } else if (style === 2) {
    // braids
    if (front) {
      braid(hx - 7, ht + 9, 7);
      braid(hx + 6, ht + 9, 7);
    } else if (back) {
      braid(hx - 3, body, 6);
      braid(hx + 1, body, 6);
    } else {
      braid(right ? hx - 6 : hx + 4, ht + 9, 8);
    }
  } else if (style === 3) {
    // ponytail
    if (front) {
      R(hx + 5, ht + 4, 2, 2, ribbon);
      lock(hx + 6, ht + 6, 3, 9, sway * 2);
    } else if (back) {
      R(hx - 1, ht + 3, 3, 1, ribbon);
      for (let r = 0; r < 10; r++) {
        const w = r < 2 ? 3 : r < 7 ? 5 : r < 9 ? 3 : 2;
        const sx = hx - Math.floor(w / 2) + Math.round((sway * r) / 5);
        R(sx, ht + 4 + r, w, 1, pal.base);
        R(sx, ht + 4 + r, 1, 1, pal.light);
        R(sx + w - 1, ht + 4 + r, 1, 1, pal.shade);
      }
    } else {
      R(right ? hx - 6 : hx + 5, ht + 4, 2, 2, ribbon);
      lock(right ? hx - 9 : hx + 5, ht + 5, 3, 10, (right ? -1 : 1) * (2 + sway));
    }
  } else if (style === 4) {
    // a bun on top, tied with a ribbon
    const rows = [3, 5, 6, 6, 5, 3];
    rows.forEach((w, r) => {
      R(hx - Math.floor(w / 2), ht - 6 + r, w, 1, pal.base);
      if (r < 3) R(hx - Math.floor(w / 2), ht - 6 + r, 1, 1, pal.light);
      if (r > 2) R(hx + Math.floor(w / 2) - 1, ht - 6 + r, 1, 1, pal.shade);
    });
    R(hx - 3, ht, 6, 1, ribbon);
  } else if (style === 5) {
    // a short bob
    if (front) {
      for (const s of [-1, 1]) for (let r = 0; r < 6; r++) R(s < 0 ? hx - 7 : hx + 6, ht + 9 + r, r > 4 ? 1 : 2, 1, pal.base);
    } else if (back) {
      for (let r = 0; r < 4; r++) {
        const hw = r < 2 ? 6 : 5;
        R(hx - hw, body - 1 + r, hw * 2 + 1, 1, pal.base);
        R(hx - hw, body - 1 + r, 2, 1, pal.light);
        R(hx + hw - 1, body - 1 + r, 2, 1, pal.shade);
      }
    } else {
      for (let r = 0; r < 6; r++) R(right ? hx - 6 : hx + 2, ht + 9 + r, r > 4 ? 3 : 4, 1, pal.base);
    }
  } else if (style === 6) {
    // pigtails
    if (front || back) {
      R(hx - 9, ht + 5, 2, 2, ribbon);
      R(hx + 8, ht + 5, 2, 2, ribbon);
      lock(hx - 10, ht + 7, 3, 8, -sway);
      lock(hx + 8, ht + 7, 3, 8, sway);
    } else {
      R(right ? hx - 8 : hx + 7, ht + 5, 2, 2, ribbon);
      lock(right ? hx - 9 : hx + 7, ht + 7, 3, 8, right ? -sway : sway);
    }
  }
}

// ------------------------------------------------------------------ storage
const clamp = (v: unknown, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < max ? v : 0);

export function cleanStyle(raw: unknown): Style {
  const r = (raw ?? {}) as Partial<Style>;
  return {
    outfit: clamp(r.outfit, OUTFITS.length),
    hairStyle: clamp(r.hairStyle, HAIR_STYLES.length),
    hairColor: clamp(r.hairColor, HAIR_COLORS.length),
  };
}

export function loadStyle(): Style {
  try {
    return cleanStyle(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
  } catch {
    return DEFAULT_STYLE;
  }
}

export function saveStyle(s: Style) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}


// Sheza's little flower crown: a wreath resting on the hair.
export function drawFlowerCrown(ctx: Ctx, px: number, py: number, dir: number, row: number) {
  const { x, y } = headAnchor(px, py, dir, row);
  const crown = ["#f29ab6", "#f6c453", "#f29ab6", "#f6c453", "#f29ab6"];
  crown.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(x - 5 + i * 2, y + 1, 2, 2);
  });
  ctx.fillStyle = "#78a158";
  ctx.fillRect(x - 6, y + 2, 1, 1);
  ctx.fillRect(x + 5, y + 2, 1, 1);
}
