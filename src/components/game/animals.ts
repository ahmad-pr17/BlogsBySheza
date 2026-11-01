// Walking animal characters, drawn in code in the Sprout Lands palette.
// Each sheet matches the farmer's layout (char.png): 8 columns of directions
// (0 up, 2 right, 4 down, 6 left, odd = diagonals) by 3 rows of frames
// (row 1 idle, rows 0 and 2 the two walking steps), 16 x 32 pixels per cell.

import type { CharKind } from "@/components/game/characters";

type Ctx = CanvasRenderingContext2D;

const OUT = "#3a2417";
const EYE = "#24160e";
const WHITE = "#fffbea";

type Look = {
  body: string;
  shade: string;
  light: string;
  belly: string;
  dark: string;
  ears: "point" | "round" | "long" | "none";
  earIn: string;
  tail: "bush" | "stub" | "puff" | "none";
  tailTip?: string;
  cheeks?: string;
  nose: string;
};

const LOOK: Partial<Record<CharKind, Look>> = {
  fox: {
    body: "#e5793a", shade: "#c25a24", light: "#f39a55", belly: "#fff1c9", dark: "#5a2f1c",
    ears: "point", earIn: "#5a2f1c", tail: "bush", tailTip: "#fff1c9", cheeks: "#fff1c9", nose: "#24160e",
  },
  bear: {
    body: "#a9794f", shade: "#855a39", light: "#c39468", belly: "#e2bf93", dark: "#5b3a24",
    ears: "round", earIn: "#d8a47c", tail: "stub", cheeks: "#e2bf93", nose: "#24160e",
  },
  bunny: {
    body: "#f1ead6", shade: "#d3c6a8", light: "#ffffff", belly: "#ffffff", dark: "#8a7a62",
    ears: "long", earIn: "#e8a0a8", tail: "puff", nose: "#e08890",
  },
  frog: {
    body: "#78a158", shade: "#58803e", light: "#9cc277", belly: "#d6e8a0", dark: "#3d5a2a",
    ears: "none", earIn: "#78a158", tail: "none", nose: "#3d5a2a",
  },
  chicken: {
    body: "#fff6e0", shade: "#e0d2b0", light: "#ffffff", belly: "#fff6e0", dark: "#8a6a3a",
    ears: "none", earIn: "#d9503a", tail: "puff", nose: "#f0b030",
  },
};

// Pixel shapes -------------------------------------------------------------
function px(c: Ctx, col: string, x: number, y: number, w = 1, h = 1) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}

function blob(
  c: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  shade?: string,
  light?: string,
  outline: string | null = OUT,
) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const ix = (x + 0.5 - cx) / Math.max(0.5, rx - 1);
      const iy = (y + 0.5 - cy) / Math.max(0.5, ry - 1);
      if (outline && ix * ix + iy * iy > 1) {
        px(c, outline, x, y);
        continue;
      }
      const d = dx * 0.55 + dy * 0.83;
      px(c, shade && d > 0.4 ? shade : light && d < -0.6 ? light : fill, x, y);
    }
}

type View = "front" | "back" | "side"; // side faces right
type Pose = { view: View; step: -1 | 0 | 1 }; // step: which foot is up (0 = standing)

function drawAnimal(c: Ctx, kind: CharKind, look: Look, pose: Pose) {
  const { view, step } = pose;
  const bob = step === 0 ? 0 : -1;
  const L = look;

  if (view === "side") {
    // ---- tail behind (left) ----
    if (L.tail === "bush") {
      blob(c, 3, 23 + bob, 3, 5, L.body, L.shade, L.light);
      px(c, L.tailTip ?? L.body, 1, 19 + bob, 4, 2);
    } else if (L.tail === "puff") {
      blob(c, 2.5, 24 + bob, 2.5, 2.5, L.light, L.shade, undefined);
    } else if (L.tail === "stub") {
      blob(c, 3, 25 + bob, 2, 2, L.body, L.shade);
    }
    // ---- legs ----
    const fl = step === 1 ? -1 : 0;
    const bl = step === -1 ? -1 : 0;
    blob(c, 5, 29.5 + bl, 2, 1.8, L.dark);
    blob(c, 11, 29.5 + fl, 2, 1.8, L.dark);
    // ---- body ----
    blob(c, 7.5, 24.5 + bob, 6, 4.5, L.body, L.shade, L.light);
    blob(c, 8.5, 26 + bob, 3.5, 2.5, L.belly, undefined, undefined, null);
    if (kind === "chicken") {
      blob(c, 6, 24 + bob, 3, 2.5, L.shade, undefined, L.light); // wing
    }
    // ---- head ----
    const hy = 16 + bob;
    if (L.ears === "point") {
      px(c, OUT, 8, hy - 8, 4, 4);
      px(c, L.body, 9, hy - 7, 2, 3);
      px(c, L.earIn, 9, hy - 5, 1, 2);
    } else if (L.ears === "round") {
      blob(c, 9.5, hy - 5, 2.3, 2.3, L.body, L.shade);
    } else if (L.ears === "long") {
      blob(c, 9, hy - 9, 1.8, 5.5, L.body, L.shade, L.light);
      px(c, L.earIn, 9, hy - 11, 1, 4);
    }
    blob(c, 11, hy, 5, 4.8, L.body, L.shade, L.light);
    if (L.cheeks) blob(c, 12, hy + 2, 3.2, 2, L.cheeks, undefined, undefined, null);
    if (kind === "frog") {
      blob(c, 12, hy - 4, 2.4, 2.4, WHITE);
      px(c, EYE, 13, hy - 4, 2, 2);
      px(c, L.dark, 11, hy + 2, 5, 1);
    } else if (kind === "chicken") {
      px(c, "#d9503a", 10, hy - 6, 2, 2);
      px(c, "#d9503a", 12, hy - 5, 2, 1);
      px(c, EYE, 13, hy - 1, 1, 2);
      px(c, "#f0b030", 15, hy, 3, 2);
      px(c, "#d9503a", 15, hy + 2, 1, 2);
    } else {
      px(c, EYE, 13, hy - 1, 1, 2);
      px(c, L.nose, 15, hy + 1, 2, 2);
    }
  } else {
    const back = view === "back";
    // ---- tail ----
    if (back) {
      if (L.tail === "bush") {
        blob(c, 8, 26 + bob, 3.5, 4.5, L.body, L.shade, L.light);
        px(c, L.tailTip ?? L.body, 6, 29 + bob, 5, 2);
      } else if (L.tail === "puff") blob(c, 8, 27 + bob, 3, 3, L.light, L.shade);
      else if (L.tail === "stub") blob(c, 8, 27 + bob, 2, 2, L.body, L.shade);
    } else if (L.tail === "bush") {
      blob(c, 13.5, 25 + bob, 2.5, 5, L.body, L.shade, L.light);
      px(c, L.tailTip ?? L.body, 12, 21 + bob, 3, 2);
    }
    // ---- feet ----
    const lf = step === 1 ? -1 : 0;
    const rf = step === -1 ? -1 : 0;
    blob(c, 5, 29.8 + lf, 2.3, 1.6, L.dark);
    blob(c, 11, 29.8 + rf, 2.3, 1.6, L.dark);
    // ---- body ----
    blob(c, 8, 24.5 + bob, 5, 5, L.body, L.shade, L.light);
    if (!back) {
      blob(c, 8, 26 + bob, 3, 3.5, L.belly, undefined, undefined, null);
      if (kind === "chicken") {
        blob(c, 4, 25 + bob, 1.6, 3, L.shade);
        blob(c, 12, 25 + bob, 1.6, 3, L.shade);
      }
    }
    // ---- ears ----
    const hy = 15.5 + bob;
    if (L.ears === "point") {
      px(c, OUT, 2, hy - 8, 5, 5);
      px(c, OUT, 9, hy - 8, 5, 5);
      px(c, L.body, 3, hy - 7, 3, 4);
      px(c, L.body, 10, hy - 7, 3, 4);
      px(c, back ? L.shade : L.earIn, 4, hy - 6, 1, 2);
      px(c, back ? L.shade : L.earIn, 11, hy - 6, 1, 2);
    } else if (L.ears === "round") {
      blob(c, 3, hy - 5, 2.6, 2.6, L.body, L.shade);
      blob(c, 13, hy - 5, 2.6, 2.6, L.body, L.shade);
      if (!back) {
        px(c, L.earIn, 2, hy - 5, 2, 2);
        px(c, L.earIn, 12, hy - 5, 2, 2);
      }
    } else if (L.ears === "long") {
      blob(c, 5, hy - 9, 2, 6, L.body, L.shade, L.light);
      blob(c, 11, hy - 9, 2, 6, L.body, L.shade, L.light);
      if (!back) {
        px(c, L.earIn, 5, hy - 12, 1, 5);
        px(c, L.earIn, 11, hy - 12, 1, 5);
      }
    }
    // ---- head ----
    blob(c, 8, hy, 6, 5.2, L.body, L.shade, L.light);
    if (!back) {
      if (L.cheeks && kind === "fox") {
        blob(c, 4.5, hy + 2.5, 3, 2.2, L.cheeks, undefined, undefined, null);
        blob(c, 11.5, hy + 2.5, 3, 2.2, L.cheeks, undefined, undefined, null);
        blob(c, 8, hy + 3.5, 3, 2, L.cheeks, undefined, undefined, null);
      } else if (L.cheeks) {
        blob(c, 8, hy + 3, 3.4, 2.4, L.cheeks, undefined, undefined, null);
      }
      if (kind === "frog") {
        blob(c, 4.5, hy - 4, 2.4, 2.4, WHITE);
        blob(c, 11.5, hy - 4, 2.4, 2.4, WHITE);
        px(c, EYE, 4, hy - 4, 2, 2);
        px(c, EYE, 11, hy - 4, 2, 2);
        px(c, L.dark, 4, hy + 3, 8, 1);
      } else if (kind === "chicken") {
        px(c, "#d9503a", 7, hy - 7, 2, 2);
        px(c, "#d9503a", 5, hy - 6, 2, 2);
        px(c, "#d9503a", 9, hy - 6, 2, 2);
        px(c, EYE, 5, hy - 1, 1, 2);
        px(c, EYE, 10, hy - 1, 1, 2);
        px(c, "#f0b030", 7, hy + 1, 2, 2);
        px(c, "#d9503a", 7, hy + 3, 2, 2);
      } else {
        px(c, EYE, 5, hy - 1, 1, 2);
        px(c, EYE, 10, hy - 1, 1, 2);
        px(c, L.nose, 7, hy + 2, 2, 1);
        px(c, EYE, 8, hy + 3, 1, 1);
      }
    }
  }
}

export function buildAnimalSheet(kind: CharKind): HTMLCanvasElement {
  const look = LOOK[kind];
  const sheet = document.createElement("canvas");
  sheet.width = 128;
  sheet.height = 96;
  const sc = sheet.getContext("2d")!;
  sc.imageSmoothingEnabled = false;
  if (!look) return sheet;

  // directions: 0 up, 1 up-right, 2 right, 3 down-right, 4 down, 5 down-left, 6 left, 7 up-left
  const views: [View, boolean][] = [
    ["back", false], ["side", false], ["side", false], ["side", false],
    ["front", false], ["side", true], ["side", true], ["side", true],
  ];
  const steps: (-1 | 0 | 1)[] = [1, 0, -1]; // rows 0, 1 (idle), 2

  const cell = document.createElement("canvas");
  cell.width = 16;
  cell.height = 32;
  const cc = cell.getContext("2d")!;
  cc.imageSmoothingEnabled = false;

  for (let col = 0; col < 8; col++)
    for (let row = 0; row < 3; row++) {
      cc.clearRect(0, 0, 16, 32);
      const [view, flip] = views[col];
      drawAnimal(cc, kind, look, { view, step: steps[row] });
      sc.save();
      if (flip) {
        sc.translate(col * 16 + 16, row * 32);
        sc.scale(-1, 1);
        sc.drawImage(cell, 0, 0);
      } else {
        sc.drawImage(cell, col * 16, row * 32);
      }
      sc.restore();
    }
  return sheet;
}
