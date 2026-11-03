import { buildAnimalSheet } from "@/components/game/animals";
import { homeProps } from "@/components/game/homeArt";

// Art: tiles and sprites come from the "Sprout Lands" pack by Cup Nooble
// (see public/game/CREDITS.txt). A few props the pack doesn't have (signs,
// jukebox, mailbox, lamp) are drawn here in the pack's palette.

type Ctx = CanvasRenderingContext2D;
export type Img = HTMLImageElement | HTMLCanvasElement;

export type Art = {
  grass: HTMLImageElement;
  dirt: HTMLImageElement;
  water: HTMLImageElement;
  char: HTMLImageElement;
  // walking sheets by character: farmer has one per shirt colour, the rest one each
  chars: Record<string, Img[]>;
  sprites: Record<string, Img | Img[]>;
};

const FILES = [
  "treeA", "treeB", "treeC", "treeD", "treeBig", "pineBig", "pineMid",
  "bushBerry", "bush", "flBlue", "flYellow", "flPink", "flSmall1", "flSmall2",
  "sunflower", "mush1", "mush2", "mush3", "rock1", "rock2", "stump",
  "stumpBig", "log", "house2", "house4", "fencePost", "fenceL", "fenceM",
  "fenceR", "bench", "blanket", "basket",
  "house0", "house8", "hut6",
  "f_paint0", "f_paint2", "f_sunflower", "f_plantA", "f_plantB", "f_lampG",
  "f_lampB", "f_lampP", "f_bedP", "f_dresser", "f_chairR", "f_chairL",
  "f_chairF", "f_stool", "f_table", "f_clockBear", "f_rugSP", "f_rugT",
  "f_rugG",
  "campfire0", "campfire1", "campfire2", "campfire3", "campfire4",
  "campfire5", "campfire6", "campfire7",
];

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function mk(w: number, h: number, draw: (c: Ctx) => void) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  draw(c);
  return cv;
}

const R = (c: Ctx, col: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

function ell(c: Ctx, col: string, cx: number, cy: number, rx: number, ry: number) {
  for (let y = -ry; y <= ry; y++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    R(c, col, cx - hw, cy + y, hw * 2 + 1, 1);
  }
}

// Sprout Lands palette picks.
const WOOD_D = "#795e53";
const WOOD = "#aa7959";
const WOOD_L = "#d79e61";
const PAPER = "#f3e5c2";
const SHADOW = "rgba(53,55,56,0.22)";

function drawnProps(): Record<string, Img> {
  const sign = (read: boolean) =>
    mk(26, 32, (c) => {
      ell(c, SHADOW, 13, 30, 8, 2);
      R(c, WOOD_D, 11, 14, 4, 17);
      R(c, WOOD, 12, 14, 2, 17);
      R(c, WOOD_D, 1, 1, 24, 16);
      R(c, WOOD_L, 2, 2, 22, 14);
      R(c, "#eeba77", 2, 2, 22, 2);
      R(c, PAPER, 6, 5, 14, 9);
      R(c, WOOD_D, 8, 7, 10, 1);
      R(c, WOOD_D, 8, 9, 7, 1);
      R(c, WOOD_D, 8, 11, 10, 1);
      if (read) {
        R(c, "#67835c", 17, 10, 2, 2);
        R(c, "#67835c", 19, 8, 2, 3);
        R(c, "#67835c", 21, 5, 2, 4);
      }
    });

  return {
    sign0: sign(false),
    sign1: sign(true),
    exclaim: mk(8, 14, (c) => {
      R(c, WOOD_D, 1, 0, 6, 10);
      R(c, WOOD_D, 1, 11, 6, 3);
      R(c, "#f7ebaa", 2, 1, 4, 8);
      R(c, "#f7ebaa", 2, 12, 4, 1);
      R(c, "#fff9d6", 2, 1, 1, 8);
    }),
    jukebox: mk(22, 30, (c) => {
      ell(c, SHADOW, 11, 28, 9, 2);
      ell(c, "#865161", 11, 11, 10, 10);
      R(c, "#865161", 1, 11, 20, 18);
      R(c, "#bd757e", 2, 11, 18, 17);
      ell(c, "#bd757e", 11, 11, 9, 9);
      ell(c, "#f7ebaa", 11, 12, 6, 6);
      R(c, "#f7ebaa", 5, 12, 12, 8);
      ell(c, "#474a4b", 11, 16, 3, 3);
      R(c, "#78a158", 5, 22, 2, 2);
      R(c, "#a35b70", 10, 22, 2, 2);
      R(c, "#7180b1", 15, 22, 2, 2);
      R(c, "#865161", 3, 27, 16, 3);
    }),
    mailbox: mk(18, 28, (c) => {
      ell(c, SHADOW, 9, 26, 6, 2);
      R(c, WOOD_D, 7, 12, 4, 15);
      R(c, "#4a588e", 1, 2, 16, 11);
      R(c, "#7180b1", 2, 3, 14, 9);
      ell(c, "#7180b1", 9, 4, 7, 3);
      R(c, "#4a588e", 5, 9, 8, 1);
      R(c, "#bd757e", 15, 0, 2, 7);
      R(c, "#bd757e", 13, 0, 2, 3);
    }),
    // The big apology board at the start point (the words are drawn on top by
    // GameWorld, so they stay sharp at any zoom).
    sorryBoard: mk(150, 84, (c) => {
      ell(c, SHADOW, 75, 82, 66, 2);
      // two posts
      R(c, WOOD_D, 20, 66, 9, 17);
      R(c, WOOD, 22, 66, 4, 17);
      R(c, WOOD_D, 121, 66, 9, 17);
      R(c, WOOD, 123, 66, 4, 17);
      // the board: dark frame, light planks, parchment
      R(c, WOOD_D, 0, 0, 150, 70);
      R(c, WOOD_L, 2, 2, 146, 66);
      R(c, "#eeba77", 2, 2, 146, 2);
      for (let x = 14; x < 148; x += 24) R(c, "#c98f58", x, 4, 1, 62);
      R(c, WOOD_D, 5, 5, 140, 60);
      R(c, PAPER, 7, 7, 136, 56);
      R(c, "#e9d6a8", 7, 60, 136, 3);
      // nails in the corners
      for (const [nx, ny] of [[3, 3], [145, 3], [3, 65], [145, 65]]) R(c, "#545959", nx, ny, 2, 2);
      // little hearts either side of the title
      const heart = (hx: number, hy: number) => {
        R(c, "#bd757e", hx + 1, hy, 2, 1);
        R(c, "#bd757e", hx + 4, hy, 2, 1);
        R(c, "#bd757e", hx, hy + 1, 7, 2);
        R(c, "#bd757e", hx + 1, hy + 3, 5, 1);
        R(c, "#bd757e", hx + 2, hy + 4, 3, 1);
        R(c, "#e8a0a8", hx + 1, hy + 1, 1, 1);
      };
      heart(14, 12);
      heart(129, 12);
      // flowers at the foot
      for (const fx of [12, 36, 108, 134]) {
        R(c, "#67835c", fx, 78, 1, 4);
        R(c, "#f7ebaa", fx - 1, 76, 3, 2);
        R(c, "#bd757e", fx, 75, 1, 1);
      }
    }),
    lamp: mk(12, 36, (c) => {
      ell(c, SHADOW, 6, 34, 4, 1);
      ell(c, "rgba(247,235,170,0.28)", 6, 6, 6, 5);
      R(c, "#545959", 5, 11, 2, 23);
      R(c, "#545959", 3, 32, 6, 2);
      R(c, "#545959", 2, 1, 8, 2);
      R(c, "#f7ebaa", 3, 3, 6, 8);
      R(c, "#fff9d6", 4, 4, 2, 5);
      R(c, "#545959", 3, 11, 6, 1);
    }),
  };
}

// Recolour only the green clothes of the character sheet.
// [hue in degrees, brightness shift] for each farmer shirt colour
const TINT_HUES: [number, number][] = [
  [52, 0.04], // yellow
  [196, 0.13], // sky blue
  [335, 0.02], // pink: Sheza only
];

function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d === 0) return [0, 0, l];
  const sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h =
    mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, sat, l];
}

function hsl2rgb(h: number, sat: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function tintChar(img: HTMLImageElement, hue: number, lift: number): Img {
  const cv = document.createElement("canvas");
  cv.width = img.width;
  cv.height = img.height;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.drawImage(img, 0, 0);
  if (hue === 0) return cv;
  const data = c.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (g > r + 8 && g > b + 8) {
      const [, sat, l] = rgb2hsl(r, g, b);
      const [nr, ng, nb] = hsl2rgb(hue, Math.min(1, sat * 1.15), Math.min(0.92, l + lift));
      d[i] = nr;
      d[i + 1] = ng;
      d[i + 2] = nb;
    }
  }
  c.putImageData(data, 0, 0);
  return cv;
}

// All the small sprites come in one image (see scripts/build-atlas.py); each is
// sliced into its own canvas so the rest of the game can treat them as before.
async function loadSprites(base: string): Promise<Record<string, Img>> {
  const raw: Record<string, Img> = {};
  try {
    const [map, sheet] = await Promise.all([
      fetch(`${base}atlas.json`).then((r) => {
        if (!r.ok) throw new Error("no atlas");
        return r.json() as Promise<Record<string, [number, number, number, number]>>;
      }),
      load(`${base}atlas.png`),
    ]);
    for (const n of FILES) {
      const [x, y, w, h] = map[n];
      raw[n] = mk(w, h, (c) => c.drawImage(sheet, x, y, w, h, 0, 0, w, h));
    }
    return raw;
  } catch {
    // Fall back to the individual files if the atlas is missing.
    const imgs = await Promise.all(FILES.map((n) => load(`${base}sprites/${n}.png`)));
    FILES.forEach((n, i) => (raw[n] = imgs[i]));
    return raw;
  }
}

export async function loadArt(): Promise<Art> {
  const base = "/game/";
  const [grass, dirt, water, char, raw] = await Promise.all([
    load(`${base}grass.png`),
    load(`${base}dirt.png`),
    load(`${base}water.png`),
    load(`${base}char.png`),
    loadSprites(base),
  ]);

  const sprites: Record<string, Img | Img[]> = { ...drawnProps(), ...homeProps() };
  // World keys -> pack sprites.
  const alias: Record<string, string> = {
    tree0: "treeA", tree1: "treeB", tree2: "treeC", tree3: "treeD",
    treeBig: "treeBig", pine: "pineMid", pine2: "pineBig",
    bush: "bush", bush2: "bushBerry",
    flower0: "flBlue", flower1: "flYellow", flower2: "flPink", flower3: "flSmall1",
    flower4: "flSmall2", sunflower: "sunflower",
    mush1: "mush1", mush2: "mush2", mush3: "mush3",
    rock: "rock1", rock2: "rock2", stump: "stump", stumpBig: "stumpBig", log: "log",
    house: "house2", houseAlt: "house4", houseG: "house0", houseC: "house8",
    home: "hut6",
    fence: "fenceM", fencePost: "fencePost", fenceL: "fenceL", fenceR: "fenceR",
    bench: "bench", picnic: "blanket", basket: "basket",
  };
  for (const [k, v] of Object.entries(alias)) sprites[k] = raw[v];
  for (const n of FILES) if (n.startsWith("f_")) sprites[n] = raw[n];
  sprites.campfire = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => raw[`campfire${i}`]);

  const chars: Record<string, Img[]> = {
    farmer: TINT_HUES.map(([h, lift]) => tintChar(char, h, lift)),
    fox: [buildAnimalSheet("fox")],
    bear: [buildAnimalSheet("bear")],
    bunny: [buildAnimalSheet("bunny")],
    frog: [buildAnimalSheet("frog")],
    chicken: [buildAnimalSheet("chicken")],
  };
  return { grass, dirt, water, char, chars, sprites };
}
