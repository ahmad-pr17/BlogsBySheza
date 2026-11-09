import type { Art, Img } from "@/components/game/art";
import type { Light } from "@/components/game/daynight";
import { P, R, TV_SCREEN } from "@/components/game/palaceArt";
import { mulberry32 } from "@/components/game/rng";
import type { RoomId, Scene } from "@/components/game/scenes";
import { T, type Interact, type Obj, type World } from "@/components/game/world";

// The palace: five rooms you can walk around. Every room is 20 x 15 tiles
// (320 x 240 px): rows 0-3 are the back wall, row 14 the front wall with the
// door, columns 0 and 19 the side walls.
//
//   Great Hall  ("home")  guards, throne, grand staircase; arches to the rest
//   Kitchen               cook with the recipe book
//   Living room           TV, piano, sofa, the cat
//   Bedroom (upstairs)    sleep, flowers, posters; a door to the study
//   Study (upstairs)      bookshelves full of readable books

export const HC = 20;
export const HR = 15;
const W = HC * T;
const H = HR * T;

export const ROOM_NAMES: Record<RoomId, string> = {
  home: "Great Hall",
  kitchen: "Kitchen",
  living: "Living room",
  bedroom: "Bedroom",
  study: "Study",
};

// Where the exit door at the bottom of each room leads.
export const EXIT_TO: Record<RoomId, Scene> = {
  home: "out",
  kitchen: "home",
  living: "home",
  bedroom: "home",
  study: "bedroom",
};

// Where you appear when you walk from one scene into a room.
export function arrival(to: RoomId, from: Scene): { x: number; y: number; dir: number } {
  if (to === "home") {
    if (from === "kitchen") return { x: 58, y: 98, dir: 4 };
    if (from === "living") return { x: 262, y: 98, dir: 4 };
    if (from === "bedroom") return { x: 160, y: 142, dir: 4 };
  }
  if (to === "bedroom" && from === "study") return { x: 276, y: 100, dir: 4 };
  return { x: 160, y: 198, dir: 0 };
}

export type RoomDrawState = {
  night: boolean;
  light: Light; // the time of day
  cook: number; // 0..1 while cooking, -1 otherwise
  dish: string | null;
  sleeping: boolean;
  heartT: number;
  x: number;
  y: number;
  tv: number; // which channel is on the TV (0 = off)
};

// The palace grows cosier the more you cook (see UNLOCKS in the recipe book).
export const UNLOCK_AT = [2, 5, 9];
export const UNLOCK_TEXT = [
  "floor lamps in the living room and a fern by the bed",
  "a second rug and cushions by the fireplace",
  "sunflowers on the windowsills and a flowery doormat",
];
export function stageFor(cooked: number) {
  return UNLOCK_AT.filter((n) => cooked >= n).length;
}

// Same clock on the wall of every room.
const CLOCK: Record<RoomId, [number, number]> = {
  home: [51, 6],
  kitchen: [116, 12],
  living: [154, 8],
  bedroom: [194, 12],
  study: [115, 12],
};

const WINDOWS: Record<RoomId, [number, number, number, number][]> = {
  home: [],
  kitchen: [[252, 14, 32, 30]],
  living: [[52, 12, 32, 34], [236, 12, 32, 34]],
  bedroom: [[124, 12, 32, 32]],
  study: [[132, 10, 40, 34]],
};

// the pot on the stove, for steam
const POT = { x: 160, y: 52 };

// Lines the guards say, in turn.
export const KNIGHT_LINES = [
  ["Halt! ...Oh, it's you. Welcome home, Your Grace.", "All quiet tonight. The cat is the only intruder.", "I guard this staircase with my life. And snacks."],
  ["Nobody gets past me. Except you. And the cat.", "My armor squeaks. Please do not mention it.", "The kitchen smells wonderful. Duty is hard."],
  ["Stand tall! The palace is watching.", "I once saluted a coat rack. It was dark.", "Long live the palace!"],
  ["Visitors are welcome, as long as they wipe their feet.", "I have not blinked since breakfast. Do not test me.", "Is it true there are cupcakes tonight?"],
];

// ------------------------------------------------------------------- layout
export function buildRoom(id: RoomId, stage = 0): World {
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

  const rect = (c0: number, r0: number, c1: number, r1: number) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) block(c, r);
  };
  const put = (
    key: string,
    x: number,
    y: number,
    o: { flat?: boolean; lift?: number; interact?: string; cols?: [number, number]; rows?: [number, number] } = {},
  ) => {
    objects.push({ key, x, y, flat: o.flat, lift: o.lift, interact: o.interact });
    if (o.cols && o.rows) rect(o.cols[0], o.rows[0], o.cols[1], o.rows[1]);
  };
  const spot = (
    name: string,
    act: string,
    label: string,
    verb: string,
    sx: number,
    sy: number,
    px: number,
    py: number,
    hitDy = 12,
    hitR = 20,
  ) =>
    interacts.push({
      id: `${id}:${name}`,
      kind: "act",
      act,
      label,
      verb,
      signX: sx,
      signY: sy,
      spotX: px,
      spotY: py,
      hitDy,
      hitR,
    });

  // every room has a door at the bottom
  const exit = EXIT_TO[id];
  const doorLabel = id === "home" ? "Door" : id === "bedroom" ? "Stairs" : "Door";
  spot(
    "door",
    exit === "out" ? "leave" : `go:${exit}`,
    doorLabel,
    id === "home" ? "Go outside" : id === "bedroom" ? "Go down the stairs" : exit === "bedroom" ? "Back to the bedroom" : "Back to the Great Hall",
    160, 222, 160, 208, 4, 22,
  );
  put("mat", 160, 222, { flat: true });

  if (id === "home") {
    put("f_runner", 160, 226, { flat: true });
    // the staircase and the two columns beside it
    put("grandStair", 160, 120, { cols: [6, 13], rows: [4, 7] });
    put("pillar", 90, 124, { cols: [5, 5], rows: [7, 7] });
    put("pillar", 230, 124, { cols: [14, 14], rows: [7, 7] });
    spot("stairs", "go:bedroom", "Grand staircase", "Climb the stairs", 160, 122, 160, 138, 18, 34);
    // arches to the other rooms (drawn on the wall)
    spot("kitchen", "go:kitchen", "Kitchen", "Go to the kitchen", 58, 76, 58, 90, 12, 22);
    spot("living", "go:living", "Living room", "Go to the living room", 262, 76, 262, 90, 12, 22);
    // throne on its dais
    put("throne", 266, 178, { cols: [16, 17], rows: [9, 10] });
    spot("throne", "throne", "Throne", "Sit on the throne", 266, 178, 266, 198, 18, 24);
    // guards
    const guards: [string, number, number][] = [
      ["knight", 124, 136],
      ["knightM", 196, 136],
      ["knight", 120, 200],
      ["knightM", 200, 200],
    ];
    guards.forEach(([key, x, y], i) => {
      put(key, x, y, { cols: [Math.floor(x / T), Math.floor(x / T)], rows: [Math.floor((y - 4) / T), Math.floor((y - 4) / T)] });
      spot(`knight${i}`, `knight:${i}`, "Guard", "Talk to the guard", x, y, x + (x < 160 ? -14 : 14), y + 4, 16, 16);
    });
    put("armorStand", 32, 112, { cols: [1, 1], rows: [6, 6] });
    put("armorStand", 288, 112, { cols: [18, 18], rows: [6, 6] });
    put("armorStand", 32, 200, { cols: [1, 1], rows: [12, 12] });
    put("bigPlant", 288, 214, { cols: [18, 18], rows: [13, 13] });
  }

  if (id === "kitchen") {
    put("pantry", 44, 86, { cols: [2, 3], rows: [4, 4] });
    put("fridge", 78, 86, { cols: [4, 5], rows: [4, 4] });
    put("counter", 112, 82, { cols: [6, 7], rows: [4, 4] });
    put("stove", 160, 82, { interact: "stove", cols: [9, 10], rows: [4, 4] });
    put("counterSink", 196, 82, { cols: [12, 13], rows: [4, 4] });
    put("counter", 228, 82, { cols: [14, 15], rows: [4, 4] });
    spot("stove", "cook", "Stove", "Cook something", 160, 82, 160, 100, 12, 24);
    put("f_rugG", 160, 168, { flat: true });
    put("island", 160, 150, { cols: [8, 11], rows: [8, 9] });
    spot("island", "cook", "Prep table", "Cook something", 160, 150, 160, 168, 10, 26);
    put("f_stool", 130, 160, { cols: [7, 7], rows: [9, 9] });
    put("f_stool", 190, 160, { cols: [11, 11], rows: [9, 9] });
    // little eating nook
    put("f_rugG", 252, 196, { flat: true });
    put("diningTable", 252, 188, { interact: "table", cols: [14, 17], rows: [10, 11] });
    put("f_chairR", 212, 190, { cols: [13, 13], rows: [11, 11] });
    put("f_chairL", 292, 190, { cols: [18, 18], rows: [11, 11] });
    spot("table", "eat", "Dining table", "Sit down and eat", 252, 188, 252, 208, 8, 28);
    put("bigPlant", 288, 120, { cols: [18, 18], rows: [7, 7] });
    put("f_plantA", 32, 214, { cols: [1, 1], rows: [13, 13] });
    put("flowerPot", 30, 140, { cols: [1, 1], rows: [8, 8] });
    if (stage >= 1) put("f_lampB", 226, 82.2, { lift: 22 });
    if (stage >= 3) put("f_sunflower", 288, 70, { lift: 28 });
  }

  if (id === "living") {
    put("tvStand", 160, 90, { cols: [8, 11], rows: [4, 5] });
    spot("tv", "tv", "TV", "Watch TV", 160, 90, 160, 104, 20, 30);
    put("f_rugRoyal", 160, 152, { flat: true });
    put("coffeeTable", 160, 128);
    put("sofaBack", 160, 172, { cols: [8, 11], rows: [9, 10] });
    put("armchair", 98, 168, { cols: [5, 6], rows: [9, 10] });
    put("armchair", 222, 168, { cols: [13, 14], rows: [9, 10] });
    put("piano", 268, 118, { cols: [15, 17], rows: [5, 6] });
    spot("piano", "piano", "Piano", "Play the piano", 268, 118, 268, 136, 16, 28);
    put("bigPlant", 32, 108, { cols: [1, 1], rows: [6, 6] });
    put("bigPlant", 292, 214, { cols: [18, 18], rows: [13, 13] });
    put("f_rugT", 52, 190, { flat: true });
    put("cushion", 52, 192, { flat: true });
    put("cat", 52, 190, { interact: "cat", cols: [3, 3], rows: [11, 11] });
    spot("cat", "pet", "Cat", "Pet the cat", 52, 190, 64, 204, 4, 16);
    put("f_plantB", 118, 206, { cols: [7, 7], rows: [12, 12] });
    put("vaseFlowers", 270, 70, { lift: 0 });
    if (stage >= 1) {
      put("lamp", 62, 142, { cols: [3, 3], rows: [8, 8] });
      put("lamp", 252, 168, { cols: [15, 15], rows: [9, 9] });
    }
    if (stage >= 2) {
      put("f_rugG", 160, 204, { flat: true });
      put("cushion", 110, 198, { flat: true });
    }
    if (stage >= 3) put("f_sunflower", 40, 70, { lift: 28 });
  }

  if (id === "bedroom") {
    put("royalBed", 60, 104, { interact: "bed", cols: [2, 5], rows: [4, 6] });
    spot("bed", "sleep", "Bed", "Sleep in the bed", 60, 104, 60, 124, 12, 30);
    put("nightstand", 26, 90, { cols: [1, 1], rows: [4, 4] });
    put("vaseFlowers", 26, 90, { lift: 14 });
    put("nightstand", 98, 90, { cols: [6, 6], rows: [4, 4] });
    put("vaseFlowers", 98, 90.2, { lift: 14 });
    put("wardrobe", 238, 96, { cols: [14, 15], rows: [4, 5] });
    put("mirror", 198, 100, { cols: [12, 12], rows: [5, 5] });
    spot("mirror", "mirror", "Mirror", "Look in the mirror", 198, 100, 198, 116, 16, 18);
    spot("study", "go:study", "Study", "Go to the study", 276, 76, 276, 90, 12, 22);
    put("f_rugFloral", 132, 160, { flat: true });
    put("f_chairF", 132, 150, { cols: [8, 8], rows: [9, 9] });
    put("flowerPot", 34, 150, { cols: [1, 1], rows: [8, 8] });
    put("flowerPot", 292, 130, { cols: [18, 18], rows: [7, 7] });
    put("flowerPot", 36, 214, { cols: [1, 1], rows: [13, 13] });
    put("flowerPot", 290, 214, { cols: [18, 18], rows: [13, 13] });
    put("flowerPot", 108, 120, { cols: [6, 6], rows: [7, 7] });
    put("vaseFlowers", 214, 196, { cols: [13, 13], rows: [11, 11] });
    put("f_dresser", 262, 196, { cols: [16, 16], rows: [11, 11] });
    put("f_lampP", 262, 196.2, { lift: 14 });
    put("vaseFlowers", 262, 196.4, { lift: 28 });
    put("f_rugSP", 238, 150, { flat: true });
    if (stage >= 1) put("f_plantA", 78, 120, { cols: [4, 4], rows: [7, 7] });
    if (stage >= 3) put("f_sunflower", 150, 70, { lift: 30 });
  }

  if (id === "study") {
    for (const [i, x] of [40, 88, 232, 280].entries()) {
      put(`bookcase${i % 3}`, x, 84, { cols: [Math.floor((x - 24) / T), Math.floor((x + 23) / T)], rows: [4, 4] });
      spot(`shelf${i}`, "books", "Bookshelf", "Browse the books", x, 84, x, 104, 16, 24);
    }
    put("ladder", 206, 90);
    put("f_rugStudy", 160, 180, { flat: true });
    put("readingDesk", 160, 142, { cols: [8, 11], rows: [7, 8] });
    put("f_chairF", 160, 168, { cols: [9, 9], rows: [10, 10] });
    put("globe", 100, 140, { interact: "globe", cols: [6, 6], rows: [8, 8] });
    spot("globe", "globe", "Globe", "Spin the globe", 100, 140, 100, 156, 14, 16);
    put("armchair", 56, 160, { cols: [2, 3], rows: [9, 10] });
    put("bookStack", 56, 190);
    put("lamp", 86, 170, { cols: [5, 5], rows: [10, 10] });
    put("f_chairR", 238, 160, { cols: [14, 14], rows: [9, 9] });
    put("f_table", 252, 162, { cols: [15, 15], rows: [9, 9] });
    put("bookStack", 252, 156, { lift: 14 });
    put("f_chairL", 266, 160, { cols: [16, 16], rows: [9, 9] });
    put("bigPlant", 292, 214, { cols: [18, 18], rows: [13, 13] });
    put("bigPlant", 30, 214, { cols: [1, 1], rows: [13, 13] });
    if (stage >= 2) put("bookStack", 200, 200);
  }

  objects.sort((a, b) => a.y - b.y);

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

// ---------------------------------------------------------------- painting
type Ctx = CanvasRenderingContext2D;

function bricks(c: Ctx, x: number, y: number, w: number, h: number, base: string, dark: string, light: string, bw = 16, bh = 8) {
  R(c, base, x, y, w, h);
  for (let yy = y, row = 0; yy < y + h; yy += bh, row++) {
    R(c, dark, x, yy + bh - 1, w, 1);
    R(c, light, x, yy, w, 1);
    for (let xx = x + (row % 2) * (bw / 2); xx < x + w; xx += bw) R(c, dark, xx, yy, 1, bh);
  }
}

function checker(c: Ctx, x: number, y: number, w: number, h: number, a: string, b: string, size = 16) {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  for (let yy = y, r = 0; yy < y + h; yy += size, r++)
    for (let xx = x, q = 0; xx < x + w; xx += size, q++) {
      R(c, (r + q) % 2 ? a : b, xx, yy, size, size);
      R(c, "rgba(255,255,255,0.3)", xx, yy, size, 1);
      R(c, "rgba(0,0,0,0.12)", xx + size - 1, yy, 1, size);
    }
  c.restore();
}

function planks(c: Ctx, rand: () => number, tones: string[]) {
  c.save();
  c.beginPath();
  c.rect(16, 64, 288, 160);
  c.clip();
  for (let row = 0, y = 64; y < 224; y += 8, row++) {
    const off = (row * 13) % 32;
    for (let x = 16 - off; x < 304; x += 32) {
      R(c, tones[Math.floor(rand() * tones.length)], x, y, 32, 8);
      R(c, "rgba(255,240,200,0.25)", x, y, 32, 1);
      R(c, "rgba(60,30,15,0.28)", x + 31, y, 1, 8);
      R(c, "rgba(60,30,15,0.16)", x, y + 7, 32, 1);
      if (rand() < 0.3) R(c, "rgba(90,50,20,0.25)", x + 4 + Math.floor(rand() * 20), y + 3, 2, 1);
    }
  }
  c.restore();
}

function sideWalls(c: Ctx, base: string, dark: string) {
  for (const sx of [0, 304]) {
    R(c, base, sx, 0, 16, 224);
    for (let y = 0; y < 224; y += 8) R(c, dark, sx, y, 16, 1);
    R(c, dark, sx + (sx === 0 ? 15 : 0), 0, 1, 224);
    R(c, "rgba(255,255,255,0.12)", sx + (sx === 0 ? 0 : 15), 0, 1, 224);
  }
  R(c, dark, 0, 224, W, 16);
  R(c, "rgba(255,255,255,0.14)", 0, 224, W, 1);
  R(c, "rgba(0,0,0,0.25)", 0, 238, W, 2);
}

function floorShade(c: Ctx) {
  for (let i = 0; i < 6; i++) R(c, `rgba(40,20,10,${0.22 - i * 0.035})`, 16, 64 + i, 288, 1);
  for (let i = 0; i < 4; i++) {
    R(c, `rgba(40,20,10,${0.18 - i * 0.045})`, 16 + i, 64, 1, 160);
    R(c, `rgba(40,20,10,${0.18 - i * 0.045})`, 303 - i, 64, 1, 160);
  }
}

function doorway(c: Ctx, frame: string, inside: string) {
  R(c, "#2a1812", 140, 216, 40, 24);
  R(c, frame, 142, 218, 36, 22);
  R(c, inside, 145, 224, 30, 16);
  R(c, "rgba(255,255,255,0.7)", 147, 226, 8, 2);
  R(c, "rgba(0,0,0,0.2)", 145, 236, 30, 4);
}

function windowFrame(c: Ctx, [x, y, w, h]: [number, number, number, number], curtain: string, curtainD: string, frame = "#795e53") {
  c.clearRect(x, y, w, h);
  R(c, frame, x - 3, y - 3, w + 6, 3);
  R(c, frame, x - 3, y + h, w + 6, 3);
  R(c, frame, x - 3, y, 3, h);
  R(c, frame, x + w, y, 3, h);
  R(c, "rgba(255,255,255,0.25)", x - 3, y - 3, w + 6, 1);
  R(c, "#9b6a4a", x - 5, y + h + 3, w + 10, 2);
  R(c, frame, x + w / 2 - 1, y, 2, h);
  R(c, frame, x, y + h / 2 - 1, w, 2);
  R(c, "rgba(255,255,255,0.35)", x + 3, y + 3, 2, 8);
  R(c, "rgba(255,255,255,0.25)", x + 6, y + 3, 1, 4);
  for (const side of [0, 1]) {
    const cx = side === 0 ? x - 3 : x + w - 5;
    R(c, curtain, cx, y - 2, 8, h + 5);
    R(c, curtainD, cx + 2, y - 2, 1, h + 5);
    R(c, curtainD, cx + 5, y - 2, 1, h + 5);
    R(c, curtainD, cx + (side === 0 ? 5 : 2), y + h / 2, 3, 2);
  }
  R(c, curtainD, x - 6, y - 6, w + 12, 4);
  for (let sx = x - 6; sx < x + w + 6; sx += 4) R(c, curtain, sx + 3, y - 2, 1, 2);
}

function archWay(c: Ctx, x: number, y: number, w: number, h: number, inner: string) {
  R(c, "#2a1f1c", x - 3, y - 3, w + 6, h + 3);
  R(c, P.stoneHi, x - 2, y - 2, w + 4, h + 2);
  R(c, inner, x, y, w, h);
  // round the top corners
  R(c, P.stoneHi, x, y, 2, 2);
  R(c, P.stoneHi, x + w - 2, y, 2, 2);
  R(c, "rgba(0,0,0,0.25)", x, y + h - 4, w, 4);
  R(c, P.goldD, x - 2, y - 3, w + 4, 1);
  // light spilling in
  R(c, "rgba(255,238,190,0.18)", x + 2, y + 2, w - 4, h - 6);
}

// A small framed poster. kind: "empress" (a crowned lady against a purple
// palace) or "farm" (a pixel farm at sunrise), both drawn from scratch.
function poster(c: Ctx, x: number, y: number, kind: "empress" | "farm", w = 22, h = 30) {
  R(c, P.out, x - 1, y - 1, w + 2, h + 2);
  R(c, P.woodL, x, y, w, h);
  if (kind === "empress") {
    R(c, P.purpleD, x + 2, y + 2, w - 4, h - 4);
    R(c, P.purple, x + 2, y + 2, w - 4, 14);
    // castle silhouette
    R(c, P.purpleD, x + 3, y + 10, 5, 6);
    R(c, P.purpleD, x + w - 8, y + 9, 5, 7);
    R(c, P.purpleD, x + 9, y + 12, 4, 4);
    // moon
    R(c, P.goldL, x + w - 9, y + 4, 3, 3);
    // the lady: gown, face, hair, crown
    const cx = x + Math.floor(w / 2);
    R(c, P.redD, cx - 4, y + 21, 9, 7);
    R(c, P.red, cx - 3, y + 20, 7, 8);
    R(c, "#f2c9a0", cx - 1, y + 14, 3, 4);
    R(c, "#e8c25a", cx - 3, y + 13, 7, 2);
    R(c, "#e8c25a", cx - 3, y + 14, 2, 8);
    R(c, "#e8c25a", cx + 2, y + 14, 2, 8);
    R(c, P.goldL, cx - 3, y + 10, 1, 3);
    R(c, P.goldL, cx - 1, y + 9, 1, 4);
    R(c, P.goldL, cx + 1, y + 9, 1, 4);
    R(c, P.goldL, cx + 3, y + 10, 1, 3);
    R(c, P.gold, cx - 3, y + 12, 7, 1);
    // sparkles
    R(c, "#ffffff", x + 4, y + 5, 1, 1);
    R(c, "#ffffff", x + w - 6, y + 14, 1, 1);
  } else {
    R(c, "#f8c860", x + 2, y + 2, w - 4, 8);
    R(c, "#f9a45c", x + 2, y + 6, w - 4, 4);
    R(c, "#8ec1f2", x + 2, y + 2, w - 4, 4);
    R(c, "#fff3a8", x + w - 9, y + 5, 5, 5); // sun
    R(c, P.leaf, x + 2, y + 10, w - 4, 8);
    R(c, P.leafD, x + 2, y + 17, w - 4, 11);
    // farmhouse
    R(c, P.red, x + 4, y + 8, 7, 3);
    R(c, P.paper, x + 4, y + 11, 7, 5);
    R(c, P.woodD, x + 7, y + 13, 2, 3);
    // crop rows
    for (let i = 0; i < 4; i++) {
      R(c, "#7a5a3c", x + 3, y + 19 + i * 2, w - 6, 1);
      for (let j = 0; j < 5; j++) R(c, i % 2 ? P.yellow : "#e07a3a", x + 4 + j * 3, y + 18 + i * 2, 1, 1);
    }
  }
}

function clock(c: Ctx, art: Art, id: RoomId) {
  const [x, y] = CLOCK[id];
  c.drawImage(art.sprites["f_clockBear"] as Img, x, y);
}

// a pot of yellow and blue flowers painted as wall decoration
function garland(c: Ctx, x0: number, x1: number, y: number) {
  for (let x = x0; x < x1; x += 4) {
    const sag = Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 4);
    R(c, P.leafD, x, y + sag, 4, 1);
    if (((x - x0) / 4) % 2 === 0) {
      R(c, P.yellow, x + 1, y + sag - 1, 2, 2);
      R(c, P.yellowL, x + 1, y + sag - 1, 1, 1);
    } else {
      R(c, P.skyBlue, x + 1, y + sag - 1, 2, 2);
      R(c, "#ffffff", x + 1, y + sag - 1, 1, 1);
    }
  }
}

export function buildRoomBg(id: RoomId, art: Art): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const rand = mulberry32(0x40e5 + id.length * 977);

  if (id === "home") {
    // marble chequerboard floor and stone walls
    checker(c, 16, 64, 288, 160, "#f8ecc2", "#e6d29a");
    floorShade(c);
    bricks(c, 0, 0, W, 64, "#ecd592", "#c9a95a", "#f7e8b4", 16, 8);
    R(c, "rgba(0,0,0,0.12)", 0, 40, W, 24);
    // ceiling beam and a gold cornice
    R(c, "#3a2a22", 0, 0, W, 6);
    R(c, P.goldD, 0, 6, W, 2);
    R(c, P.gold, 0, 6, W, 1);
    // plinth along the bottom of the wall
    R(c, "#c9a95a", 0, 56, W, 8);
    R(c, "#f7e8b4", 0, 56, W, 1);
    R(c, P.goldD, 0, 63, W, 1);
    sideWalls(c, "#e0c87c", "#b8964a");
    doorway(c, P.goldD, "#f1e3b4");
    // rose window above the stairs
    R(c, "#2a1f1c", 144, 6, 32, 32);
    for (let yy = 0; yy < 28; yy++)
      for (let xx = 0; xx < 28; xx++) {
        const dx = xx - 13.5;
        const dy = yy - 13.5;
        const d = Math.hypot(dx, dy);
        if (d > 14) continue;
        const ang = Math.atan2(dy, dx);
        const seg = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8);
        const cols = [P.blueL, P.redL, P.goldL, P.leaf, P.purpleL, P.skyBlueL, P.red, P.gold];
        R(c, d < 3 ? P.goldL : d > 12.5 || Math.abs(dx) < 0.7 || Math.abs(dy) < 0.7 ? P.goldD : cols[seg], 146 + xx, 8 + yy, 1, 1);
      }
    // arches to the kitchen (left) and living room (right), with clocks above
    archWay(c, 44, 26, 28, 38, "#4a3524");
    archWay(c, 248, 26, 28, 38, "#2d3a5a");
    R(c, P.goldD, 54, 44, 8, 1);
    // hanging banners
    for (const bx of [22, 286]) {
      R(c, P.goldD, bx - 1, 10, 14, 2);
      R(c, P.purpleD, bx, 12, 12, 30);
      R(c, P.purple, bx + 1, 12, 10, 28);
      R(c, P.purpleL, bx + 1, 12, 2, 26);
      R(c, P.gold, bx + 4, 18, 4, 5);
      R(c, P.goldL, bx + 5, 19, 2, 2);
      R(c, P.out, bx, 42, 12, 1);
      R(c, P.purple, bx + 1, 42, 4, 3);
      R(c, P.purple, bx + 7, 42, 4, 3);
    }
    // torch sconces on the wall (flames are drawn live)
    for (const tx of [82, 238]) {
      R(c, P.out, tx - 2, 36, 5, 10);
      R(c, P.steelD, tx - 1, 37, 3, 8);
      R(c, P.goldD, tx - 3, 34, 7, 3);
    }
  } else if (id === "kitchen") {
    checker(c, 16, 64, 288, 160, "#f0e4d0", "#c9805a", 16);
    floorShade(c);
    // tiled wall
    R(c, "#f6efe0", 0, 0, W, 64);
    for (let y = 0; y < 64; y += 8)
      for (let x = 0; x < W; x += 8) {
        R(c, "#dcd2bd", x + 7, y, 1, 8);
        R(c, "#dcd2bd", x, y + 7, 8, 1);
      }
    for (let x = 0; x < W; x += 16) R(c, "#7fb7d6", x + 4, 40, 8, 8);
    for (let x = 0; x < W; x += 16) R(c, "#b8dcee", x + 5, 41, 6, 3);
    R(c, "#6b4532", 0, 0, W, 6);
    R(c, "#4f3224", 0, 5, W, 1);
    R(c, "#795e53", 0, 62, W, 2);
    sideWalls(c, "#b9845e", "#8a5f45");
    doorway(c, "#4a2f22", "#f1e3b4");
    windowFrame(c, WINDOWS.kitchen[0], "#7fb7d6", "#4f8fd8");
    // range hood over the stove
    R(c, P.out, 138, 22, 44, 20);
    R(c, P.steel, 140, 24, 40, 16);
    R(c, P.steelL, 140, 24, 40, 3);
    R(c, P.steelD, 140, 38, 40, 2);
    R(c, P.out, 154, 6, 12, 18);
    R(c, P.steel, 156, 8, 8, 16);
    // jars on a shelf, hanging pots
    R(c, "#6b4532", 14 + 20, 22, 58, 3);
    const jars = ["#bd757e", "#78a158", "#e8b66a", "#7180b1", "#d79e61"];
    jars.forEach((col, i) => {
      const jx = 37 + i * 11;
      R(c, "#4a2f22", jx, 14, 7, 8);
      R(c, col, jx + 1, 15, 5, 6);
      R(c, "rgba(255,255,255,0.45)", jx + 1, 15, 1, 5);
      R(c, "#795e53", jx + 1, 12, 5, 2);
    });
    R(c, "#4a2f22", 196, 16, 30, 2);
    for (const [px, pr] of [[200, 5], [212, 4], [222, 3]] as [number, number][]) {
      R(c, "#4a2f22", px, 18, 1, 4);
      R(c, "#5f6465", px - pr + 1, 22, pr * 2 - 1, pr);
      R(c, "#353738", px - pr + 2, 23, pr * 2 - 3, pr - 2);
    }
    // a recipe card board
    R(c, P.out, 266, 22, 22, 22);
    R(c, P.woodL, 267, 23, 20, 20);
    R(c, P.paper, 270, 26, 7, 6);
    R(c, "#f8d7da", 279, 27, 6, 7);
    R(c, P.paper, 272, 34, 8, 6);
    clock(c, art, id);
  } else if (id === "living") {
    // plush blue carpet floor with a soft border
    c.save();
    c.beginPath();
    c.rect(16, 64, 288, 160);
    c.clip();
    R(c, "#6f84d6", 16, 64, 288, 160);
    for (let y = 64; y < 224; y += 4)
      for (let x = 16 + ((y / 4) % 2) * 2; x < 304; x += 4) R(c, rand() < 0.5 ? "#7a8fe0" : "#6479c8", x, y, 2, 2);
    c.restore();
    R(c, P.gold, 16, 64, 288, 1);
    floorShade(c);
    // wallpaper with gold stripes and a wainscot
    R(c, "#e9e0f5", 0, 0, W, 64);
    for (let x = 0; x < W; x += 10) {
      R(c, "#cdbfe6", x, 6, 3, 40);
      R(c, P.goldL, x + 4, 6, 1, 40);
    }
    R(c, "#4a3470", 0, 46, W, 18);
    for (let x = 4; x < W; x += 24) {
      R(c, "#3c2a5c", x, 50, 20, 11);
      R(c, "#5a4488", x + 1, 51, 18, 9);
    }
    R(c, P.gold, 0, 46, W, 1);
    R(c, P.goldD, 0, 47, W, 1);
    R(c, "#2a1f44", 0, 62, W, 2);
    R(c, "#3a2a22", 0, 0, W, 6);
    R(c, P.goldD, 0, 6, W, 1);
    sideWalls(c, "#5a4488", "#3c2a5c");
    doorway(c, "#3c2a5c", "#f1e3b4");
    for (const w of WINDOWS.living) windowFrame(c, w, "#d9545c", "#a8323a", "#4a3470");
    poster(c, 100, 14, "empress", 24, 32);
    poster(c, 196, 14, "farm", 24, 32);
    // fireplace-style mantle shelf with candles above the TV is skipped: the TV is the star
    clock(c, art, id);
  } else if (id === "bedroom") {
    planks(c, rand, ["#e0b274", "#d6a76b", "#cf9f64", "#dbb078"]);
    floorShade(c);
    // wallpaper dotted with yellow and blue flowers
    R(c, "#fbf3d2", 0, 0, W, 64);
    for (let y = 8; y < 44; y += 10)
      for (let x = 4 + ((y / 10) % 2) * 6; x < W; x += 12) {
        R(c, P.skyBlue, x, y, 3, 1);
        R(c, P.skyBlue, x + 1, y - 1, 1, 3);
        R(c, "#ffffff", x + 1, y, 1, 1);
        R(c, P.yellow, x + 6, y + 4, 3, 1);
        R(c, P.yellow, x + 7, y + 3, 1, 3);
        R(c, P.yellowL, x + 7, y + 4, 1, 1);
      }
    R(c, "#4f8fd8", 0, 46, W, 18);
    for (let x = 4; x < W; x += 24) {
      R(c, "#3d6fb3", x, 50, 20, 11);
      R(c, "#6fa6e6", x + 1, 51, 18, 9);
    }
    R(c, P.yellow, 0, 46, W, 1);
    R(c, P.goldD, 0, 47, W, 1);
    R(c, "#2b4a80", 0, 62, W, 2);
    R(c, "#6b4532", 0, 0, W, 6);
    R(c, "#956a52", 0, 0, W, 1);
    garland(c, 20, 118, 8);
    garland(c, 200, 300, 8);
    sideWalls(c, "#6fa6e6", "#3d6fb3");
    doorway(c, "#3d6fb3", "#f1e3b4");
    windowFrame(c, WINDOWS.bedroom[0], "#fbe98a", "#e2b43c", "#795e53");
    // posters: Remarried Empress x2, Stardew-style farm x2
    poster(c, 92, 14, "empress");
    poster(c, 166, 14, "farm", 22, 26);
    poster(c, 210, 14, "farm", 22, 26);
    poster(c, 233, 12, "empress", 24, 32);
    // the door to the study
    archWay(c, 262, 28, 28, 36, "#5a3d2a");
    R(c, P.goldD, 272, 46, 8, 1);
    clock(c, art, id);
  } else {
    // study: dark wood floor and panelled walls
    planks(c, rand, ["#8a5f45", "#82583f", "#7a5139", "#8f6448"]);
    floorShade(c);
    R(c, "#3f5a46", 0, 0, W, 64);
    for (let x = 0; x < W; x += 16) {
      R(c, "#35503d", x, 6, 1, 38);
      R(c, "#4a6a52", x + 1, 6, 1, 38);
    }
    R(c, "#4a3228", 0, 46, W, 18);
    for (let x = 4; x < W; x += 24) {
      R(c, "#3a2820", x, 50, 20, 11);
      R(c, "#5a4034", x + 1, 51, 18, 9);
    }
    R(c, P.goldD, 0, 46, W, 1);
    R(c, "#2a1b14", 0, 62, W, 2);
    R(c, "#2a1b14", 0, 0, W, 6);
    R(c, P.goldD, 0, 6, W, 1);
    sideWalls(c, "#4a3228", "#2a1b14");
    doorway(c, "#2a1b14", "#f1e3b4");
    windowFrame(c, WINDOWS.study[0], "#6b4c9a", "#4a3470", "#4a3228");
    // a small painting between the window and the bookcase
    R(c, P.out, 193, 20, 14, 12);
    R(c, P.goldD, 194, 21, 12, 10);
    R(c, P.skyBlue, 195, 22, 10, 5);
    R(c, P.leaf, 195, 27, 10, 3);
    R(c, P.paper, 199, 24, 2, 3);
    clock(c, art, id);
  }
  return cv;
}

// -------------------------------------------------------------- the TV picture
// Drawn live. channel 1 = a palace drama, 2 = a cosy fire, 3 = a cooking show.
export const TV_CHANNELS = ["The Remarried Empress", "Fireplace", "Cook-along"];
export function drawTvPicture(c: Ctx, x: number, y: number, w: number, h: number, t: number, channel: number) {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  const u = w / 48; // everything below is designed on a 48 x 30 screen
  const px = (ax: number, ay: number, aw: number, ah: number, col: string) =>
    R(c, col, x + ax * u, y + ay * u, aw * u, ah * u);
  if (channel === 1) {
    // dusk sky over a palace
    px(0, 0, 48, 14, "#3d2d6b");
    px(0, 8, 48, 8, "#8a4f8a");
    px(0, 14, 48, 16, "#2a1f44");
    for (let i = 0; i < 6; i++) if (Math.sin(t * 3 + i * 2) > -0.3) px((i * 9 + 4) % 46, 2 + (i * 5) % 8, 1, 1, "#fff9d6");
    px(36, 3, 4, 4, "#f7ebaa");
    px(37, 3, 3, 3, "#3d2d6b");
    // castle silhouette with lit windows
    px(2, 12, 8, 14, "#1d1530");
    px(12, 8, 6, 18, "#1d1530");
    px(32, 10, 8, 16, "#1d1530");
    px(41, 14, 6, 12, "#1d1530");
    for (const [wx, wy] of [[4, 16], [14, 13], [34, 15], [43, 18]]) px(wx, wy, 1, 2, Math.sin(t * 2 + wx) > -0.5 ? "#f7dd7a" : "#9c7420");
    // the empress in the middle: gown, shoulders, crown, hair blowing a little
    const sway = Math.sin(t * 1.6);
    px(19, 20, 10, 10, "#a8323a");
    px(20, 19, 8, 3, "#d9545c");
    px(20, 17, 8, 2, "#f2c9a0");
    px(21, 11, 6, 7, "#f2c9a0");
    px(19 + sway * 0.5, 10, 3, 12, "#e8c25a");
    px(26 - sway * 0.5, 10, 3, 12, "#e8c25a");
    px(21, 9, 6, 2, "#e8c25a");
    px(21, 7, 1, 3, "#f7dd7a");
    px(23, 6, 1, 4, "#f7dd7a");
    px(25, 6, 1, 4, "#f7dd7a");
    px(27 - 1, 7, 1, 3, "#f7dd7a");
    px(21, 9, 6, 1, "#e2b43c");
    px(22, 13, 1, 1, "#2a1f44");
    px(25, 13, 1, 1, "#2a1f44");
    // title card fades in and out
    const a = 0.5 + Math.sin(t * 0.9) * 0.5;
    c.fillStyle = `rgba(0,0,0,${0.5 * a})`;
    c.fillRect(x, y + h - 7 * u, w, 7 * u);
    c.fillStyle = `rgba(247,221,122,${a})`;
    c.fillRect(x + 10 * u, y + h - 5 * u, 28 * u, 1 * u);
    c.fillRect(x + 14 * u, y + h - 3 * u, 20 * u, 1 * u);
  } else if (channel === 2) {
    px(0, 0, 48, 30, "#2a1812");
    px(4, 4, 40, 22, "#7b756d");
    for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) px(4 + q * 7 + (r % 2) * 3, 4 + r * 6, 6, 1, "#68625b");
    px(10, 12, 28, 14, "#1a0f0b");
    for (let row = 0; row < 10; row++) {
      const wob = Math.sin(t * 8 + row * 0.9) * 1.2;
      const fw = Math.max(2, Math.round(14 * (1 - row / 11)));
      px(24 - fw / 2 + wob, 25 - row, fw, 1, row < 3 ? "#f7e07a" : row < 6 ? "#f0a23a" : "#d9503a");
    }
    px(14, 25, 20, 2, "#795e53");
    px(2, 2, 44, 2, "#6b4532");
  } else {
    px(0, 0, 48, 30, "#f6efe0");
    px(0, 22, 48, 8, "#aa7959");
    px(0, 22, 48, 1, "#d79e61");
    // the cook: face, hat, hands stirring a bowl
    px(18, 6, 12, 9, "#f2c9a0");
    px(16, 1, 16, 7, "#ffffff");
    px(14, 4, 20, 4, "#ffffff");
    px(21, 10, 1, 1, "#2a1f44");
    px(26, 10, 1, 1, "#2a1f44");
    px(22, 13, 4, 1, "#bd757e");
    px(14, 14, 20, 8, "#ffffff");
    px(18, 20, 12, 5, "#7fb7d6");
    px(19, 20, 10, 2, "#f3e5c2");
    const sx = 24 + Math.sin(t * 5) * 3;
    px(sx, 17, 2, 8, "#aa7959");
    px(6, 16, 6, 6, "#f0a0a8");
    px(36, 17, 6, 5, "#e8b66a");
  }
  // scanlines and a little glass shine
  c.fillStyle = "rgba(0,0,0,0.12)";
  for (let yy = 0; yy < h; yy += 2) c.fillRect(x, y + yy, w, 1);
  c.fillStyle = "rgba(255,255,255,0.1)";
  c.fillRect(x, y, w, h / 5);
  c.restore();
}

// ------------------------------------------------------------------ per frame
function sky(c: Ctx, id: RoomId, light: Light, t: number) {
  const stops: Record<Light["period"], string[]> = {
    morning: ["#9ccdf0", "#cfe3f4", "#fbd9bf", "#f9c79a"],
    noon: ["#7cc4ee", "#a9ddf2", "#cdeef6", "#d8f2f4"],
    sunset: ["#5d4f9c", "#c4639a", "#f08a5a", "#ffcf86"],
    night: ["#141a48", "#1f2a66", "#2d3a82", "#3a4796"],
  };
  const ground: Record<Light["period"], string> = {
    morning: "#8fb86a",
    noon: "#78a158",
    sunset: "#6f8f4e",
    night: "#2d4a3a",
  };
  WINDOWS[id].forEach(([x, y, w, h], i) => {
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    const g = c.createLinearGradient(0, y, 0, y + h);
    stops[light.period].forEach((col, k, arr) => g.addColorStop(k / (arr.length - 1), col));
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    if (light.period === "night") {
      for (let s = 0; s < 8; s++) {
        R(c, Math.sin(t * 2 + s * 1.7) > 0 ? "#fff9d6" : "#9aa5d8", x + 3 + ((s * 11 + i * 5) % (w - 6)), y + 3 + ((s * 7 + i * 3) % (h - 12)), 1, 1);
      }
      if (i === 0) {
        c.fillStyle = "#f7ebaa";
        c.beginPath();
        c.arc(x + w * 0.7, y + 9, 5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = stops.night[1];
        c.beginPath();
        c.arc(x + w * 0.7 + 2.5, y + 7.5, 4.4, 0, Math.PI * 2);
        c.fill();
      }
    } else {
      // the sun: low and pale in the morning, high at noon, big and orange at sunset
      const sun =
        light.period === "morning"
          ? { sx: x + w * 0.25, sy: y + h * 0.68, r: 4, col: "#fff2b8" }
          : light.period === "noon"
            ? { sx: x + w * 0.68, sy: y + 7, r: 4, col: "#fffbe0" }
            : { sx: x + w * 0.5, sy: y + h - 7, r: 7, col: "#ff9a4a" };
      c.fillStyle = sun.col;
      c.beginPath();
      c.arc(sun.sx, sun.sy, sun.r, 0, Math.PI * 2);
      c.fill();
      // a drifting cloud
      const cx = x - 14 + ((t * 2.5 + i * 22) % (w + 28));
      const cloud = light.period === "sunset" ? "#ffc9b0" : "#ffffff";
      R(c, cloud, cx, y + 6, 12, 4);
      R(c, cloud, cx + 3, y + 4, 6, 3);
    }
    R(c, ground[light.period], x, y + h - 5, w, 5);
    R(c, "rgba(255,255,255,0.12)", x, y + h - 5, w, 1);
    c.restore();
  });
}

function flame(c: Ctx, x: number, y: number, t: number, seed: number, scale = 1) {
  for (let row = 0; row < 9; row++) {
    const wob = Math.sin(t * 9 + row * 0.8 + seed) * 1;
    const w = Math.max(1, Math.round((6 - row * 0.6) * scale));
    R(c, row < 3 ? "#f7e07a" : row < 6 ? "#f0a23a" : "#d9503a", Math.round(x - w / 2 + wob), y - row, w, 1);
  }
}

function zGlyph(c: Ctx, x: number, y: number, s: number, col: string) {
  R(c, col, x, y, s, 1);
  for (let i = 0; i < s; i++) R(c, col, x + s - 1 - i, y + i, 1, 1);
  R(c, col, x, y + s - 1, s, 1);
}

// Where the lamps, torches and fires are in each room (x, y, radius, strength):
// they shine through the darkness at night.
const LIGHT_SRC: Record<RoomId, [number, number, number, number][]> = {
  home: [[82, 34, 56, 1], [238, 34, 56, 1], [160, 26, 120, 1], [160, 150, 80, 0.5]],
  kitchen: [[160, 92, 70, 1], [262, 30, 44, 0.7], [160, 150, 70, 0.6], [252, 186, 44, 0.5]],
  living: [[160, 70, 78, 1], [62, 142, 44, 0.8], [252, 168, 44, 0.8], [160, 150, 80, 0.5]],
  bedroom: [[26, 76, 36, 1], [98, 76, 36, 1], [262, 184, 38, 0.8], [130, 40, 44, 0.6], [60, 110, 56, 0.5]],
  study: [[86, 150, 46, 1], [214, 112, 40, 0.8], [160, 142, 78, 0.8], [220, 22, 44, 0.4]],
};

let maskCv: HTMLCanvasElement | null = null;
const roomMask = () => {
  if (!maskCv) {
    maskCv = document.createElement("canvas");
    maskCv.width = W;
    maskCv.height = H;
  }
  return maskCv;
};

export function drawRoomScene(
  c: Ctx,
  art: Art,
  bg: HTMLCanvasElement,
  id: RoomId,
  world: World,
  s: RoomDrawState,
  t: number,
  actors: { y: number; draw: () => void }[], // players, sorted by y
) {
  sky(c, id, s.light, t);
  c.drawImage(bg, 0, 0);

  const spriteOf = (o: Obj): Img => {
    if (o.key === "cat") return art.sprites[Math.floor(t * 1.3) % 2 ? "cat1" : "cat0"] as Img;
    const sp = art.sprites[o.key];
    return (Array.isArray(sp) ? sp[0] : sp) as Img;
  };
  const drawObj = (o: Obj, dy = 0) => {
    const sp = spriteOf(o);
    c.drawImage(sp, Math.round(o.x - sp.width / 2), Math.round(o.y - sp.height - (o.lift ?? 0) + dy));
  };

  // light through the windows: sun by day, orange at sunset, moonlight at night
  if (WINDOWS[id].length) {
    const beam = { morning: "255,226,170", noon: "255,244,200", sunset: "255,160,90", night: "140,160,255" }[s.light.period];
    const strength = s.light.period === "sunset" ? 0.16 : s.light.period === "night" ? 0.07 : 0.1;
    c.fillStyle = `rgba(${beam},${strength + Math.sin(t * 0.6) * 0.02})`;
    for (const [wx, , ww] of WINDOWS[id]) {
      c.beginPath();
      c.moveTo(wx + 2, 64);
      c.lineTo(wx + ww - 2, 64);
      c.lineTo(wx + ww + 60, 176);
      c.lineTo(wx + 20, 176);
      c.fill();
    }
  }

  // the fire under the kitchen hood is a stove burner; the hall has torches
  if (id === "home") {
    for (const tx of [82, 238]) {
      flame(c, tx, 33, t, tx, 1.2);
      c.fillStyle = "rgba(255,200,120,0.08)";
      c.beginPath();
      c.arc(tx, 36, 20, 0, Math.PI * 2);
      c.fill();
    }
  }

  for (const o of world.objects) if (o.flat) drawObj(o);

  // the TV picture is drawn onto the screen before the (non-flat) things around it
  const tvObj = id === "living" ? world.objects.find((o) => o.key === "tvStand") : undefined;

  let ai = 0;
  for (const o of world.objects) {
    if (o.flat) continue;
    while (ai < actors.length && o.y > actors[ai].y) actors[ai++].draw();
    // the guards breathe
    const isKnight = o.key === "knight" || o.key === "knightM";
    const bob = isKnight ? Math.round(Math.sin(t * 1.6 + o.x * 0.1) * 0.6 + 0.4) : 0;
    drawObj(o, -bob);
    if (o === tvObj) {
      const sp = spriteOf(o);
      const left = Math.round(o.x - sp.width / 2);
      const top = Math.round(o.y - sp.height);
      if (s.tv > 0) drawTvPicture(c, left + TV_SCREEN.x, top + TV_SCREEN.y, TV_SCREEN.w, TV_SCREEN.h, t, s.tv);
    }
    if ((o.key === "f_table" || o.key === "diningTable") && s.dish) {
      const d = art.sprites[s.dish] as Img;
      c.drawImage(d, Math.round(o.x - d.width / 2), Math.round(o.y - d.height - (o.key === "diningTable" ? 15 : 7)));
    }
    if (o.key === "chandelier") drawObj(o);
  }
  while (ai < actors.length) actors[ai++].draw();

  // golden light in the hall: a warm glow from every torch and the chandelier
  if (id === "home") {
    c.globalCompositeOperation = "lighter";
    const glow = (x: number, y: number, r: number, a: number) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,215,110,${a})`);
      g.addColorStop(1, "rgba(255,215,110,0)");
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const pulse = 1 + Math.sin(t * 2.4) * 0.08;
    const lm = 0.7 + s.light.dark * 0.15;
    glow(160, 30, 120 * pulse, 0.3 * lm);
    glow(82, 34, 46, 0.32 * lm);
    glow(238, 34, 46, 0.32 * lm);
    glow(160, 150, 130, 0.12 * lm);
    c.globalCompositeOperation = "source-over";
  }

  // the chandelier hangs over the hall and sways a little
  if (id === "home") {
    const ch = art.sprites["chandelier"] as Img;
    const sway = Math.sin(t * 0.8) * 1.2;
    c.drawImage(ch, Math.round(160 - ch.width / 2 + sway), 2);
    for (const cx of [4, 12, 21, 30, 37]) flame(c, Math.round(160 - ch.width / 2 + cx + 1 + sway), 14, t, cx, 0.5);
  }

  // someone asleep in the bed
  if (s.sleeping && id === "bedroom") {
    R(c, "#6b4a32", 40, 86, 12, 6);
    R(c, "#f2c9a0", 44, 92, 7, 5);
    R(c, "#bd757e", 36, 96, 22, 8);
    for (let i = 0; i < 3; i++) {
      const age = (t * 9 + i * 8) % 26;
      zGlyph(c, 66 + i * 4, Math.round(80 - age), 3 + i, `rgba(255,255,255,${1 - age / 26})`);
    }
  }

  // steam and bubbles while cooking
  if (s.cook >= 0 && id === "kitchen") {
    for (let i = 0; i < 7; i++) {
      const age = (t * 16 + i * 6) % 30;
      const sx = POT.x + Math.sin(t * 2.2 + i * 1.9) * 3 + (i - 3);
      R(c, `rgba(255,255,255,${0.75 - age / 40})`, Math.round(sx), Math.round(POT.y - age), 2 + (i % 2), 2);
    }
  }

  // a heart over the cat
  const ha = t - s.heartT;
  if (id === "living" && ha >= 0 && ha < 1.6) {
    const hy = 170 - ha * 12;
    const col = `rgba(217,74,100,${1 - ha / 1.6})`;
    R(c, col, 50, Math.round(hy), 2, 2);
    R(c, col, 54, Math.round(hy), 2, 2);
    R(c, col, 49, Math.round(hy) + 1, 8, 2);
    R(c, col, 50, Math.round(hy) + 3, 6, 1);
    R(c, col, 52, Math.round(hy) + 4, 2, 1);
  }

  // light: a soft vignette, then the time of day (a gentler version of the
  // grade used outside), then every lamp and torch shining through the dark
  const vg = c.createRadialGradient(W / 2, H / 2 + 10, 60, W / 2, H / 2 + 10, 210);
  vg.addColorStop(0, "rgba(40,20,10,0)");
  vg.addColorStop(1, "rgba(40,20,10,0.22)");
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);
  const L = s.light;
  const k = 0.75; // how much of the outside light reaches indoors
  const mix = (v: number) => Math.round(255 + (v - 255) * k);
  const mult = `rgb(${mix(L.mult[0])},${mix(L.mult[1])},${mix(L.mult[2])})`;
  if (L.dark > 0.08) {
    // the tint has holes where the lamps, torches and fires are, so those spots
    // keep their warm colours while the rest of the room goes deep blue
    const m = roomMask();
    const mc = m.getContext("2d")!;
    mc.globalCompositeOperation = "source-over";
    mc.clearRect(0, 0, W, H);
    mc.fillStyle = mult;
    mc.fillRect(0, 0, W, H);
    mc.globalCompositeOperation = "destination-out";
    for (const [lx, ly, lr, la] of LIGHT_SRC[id]) {
      const g = mc.createRadialGradient(lx, ly, 0, lx, ly, lr);
      g.addColorStop(0, `rgba(0,0,0,${la})`);
      g.addColorStop(0.55, `rgba(0,0,0,${la * 0.7})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      mc.fillStyle = g;
      mc.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
    }
    mc.globalCompositeOperation = "source-over";
    c.globalCompositeOperation = "multiply";
    c.drawImage(m, 0, 0);
    c.globalCompositeOperation = "source-over";
  } else if (mix(L.mult[0]) + mix(L.mult[1]) + mix(L.mult[2]) < 760) {
    c.globalCompositeOperation = "multiply";
    c.fillStyle = mult;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "source-over";
  }
  if (L.add[3] > 0.005) {
    c.fillStyle = `rgba(${Math.round(L.add[0])},${Math.round(L.add[1])},${Math.round(L.add[2])},${L.add[3] * 0.6})`;
    c.fillRect(0, 0, W, H);
  }
  if (L.dark > 0.2) {
    c.globalCompositeOperation = "overlay";
    c.fillStyle = `rgba(30,50,255,${0.3 * L.dark})`;
    c.fillRect(0, 0, W, H);
    // each lamp lays its warm colour over its own spot, with a tiny glow
    for (const [lx, ly, lr, la] of LIGHT_SRC[id]) {
      const r = lr * 0.75;
      const g = c.createRadialGradient(lx, ly, 0, lx, ly, r);
      g.addColorStop(0, `rgba(255,190,80,${0.8 * L.dark * la})`);
      g.addColorStop(0.7, `rgba(255,170,70,${0.3 * L.dark * la})`);
      g.addColorStop(1, "rgba(255,170,70,0)");
      c.fillStyle = g;
      c.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    c.globalCompositeOperation = "lighter";
    for (const [lx, ly, lr, la] of LIGHT_SRC[id]) {
      const r = lr * 0.22;
      const g = c.createRadialGradient(lx, ly, 0, lx, ly, r);
      g.addColorStop(0, `rgba(255,208,120,${0.26 * L.dark * la})`);
      g.addColorStop(1, "rgba(255,190,90,0)");
      c.fillStyle = g;
      c.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    c.globalCompositeOperation = "source-over";
  }
  if (s.cook >= 0 && id === "kitchen") {
    c.globalCompositeOperation = "lighter";
    const g = c.createRadialGradient(160, 92, 0, 160, 92, 40);
    g.addColorStop(0, `rgba(255,150,70,${0.3 + Math.sin(t * 11) * 0.05})`);
    g.addColorStop(1, "rgba(255,150,70,0)");
    c.fillStyle = g;
    c.fillRect(120, 52, 80, 80);
    c.globalCompositeOperation = "source-over";
  }
}
