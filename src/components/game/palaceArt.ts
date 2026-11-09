// Hand-drawn props for the palace (the Sprout Lands pack has no castle, knights
// or royal furniture). Everything is built once into small canvases, in the
// same warm palette as the rest of the game plus stone, gold and royal colours.

type Ctx = CanvasRenderingContext2D;
type Cv = HTMLCanvasElement;

function mk(w: number, h: number, draw: (c: Ctx) => void): Cv {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  draw(c);
  return cv;
}
export const R = (c: Ctx, col: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};
function ell(c: Ctx, col: string, cx: number, cy: number, rx: number, ry: number) {
  for (let y = -ry; y <= ry; y++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    R(c, col, cx - hw, cy + y, hw * 2 + 1, 1);
  }
}
const flip = (src: Cv) =>
  mk(src.width, src.height, (c) => {
    c.translate(src.width, 0);
    c.scale(-1, 1);
    c.drawImage(src, 0, 0);
  });

export const P = {
  out: "#3a2a22",
  woodD: "#795e53",
  wood: "#aa7959",
  woodL: "#d79e61",
  woodHi: "#eec58f",
  shadow: "rgba(53,55,56,0.24)",
  stoneD: "#5d646b",
  stone: "#8a9199",
  stoneL: "#b4bbc2",
  stoneHi: "#d3d8dc",
  steelD: "#5b6670",
  steel: "#8f9ba6",
  steelL: "#c7d0d8",
  goldD: "#9c7420",
  gold: "#e2b43c",
  goldL: "#f7dd7a",
  redD: "#7a1f2b",
  red: "#a8323a",
  redL: "#d9545c",
  blueD: "#2b3a7a",
  blue: "#3d4f9f",
  blueL: "#6f84d6",
  purpleD: "#4a3470",
  purple: "#6b4c9a",
  purpleL: "#9a7fcb",
  marble: "#ece8df",
  marbleD: "#cdc7bb",
  paper: "#f3e5c2",
  yellow: "#f6cf3f",
  yellowL: "#fbe98a",
  skyBlue: "#4f8fd8",
  skyBlueL: "#8ec1f2",
  leaf: "#5f9a4a",
  leafD: "#3f7035",
};

// ---------------------------------------------------------------- a flower
function bloom(c: Ctx, x: number, y: number, col: string, hi: string) {
  R(c, col, x, y + 1, 3, 1);
  R(c, col, x + 1, y, 1, 3);
  R(c, hi, x + 1, y + 1, 1, 1);
}

// ------------------------------------------------------------------- knights
function knightSprite(): Cv {
  return mk(22, 36, (c) => {
    const ox = 3;
    ell(c, P.shadow, 11, 34, 8, 1);
    // legs and boots
    R(c, P.steelD, ox + 5, 24, 4, 9);
    R(c, P.steelD, ox + 10, 24, 4, 9);
    R(c, P.steel, ox + 5, 24, 2, 8);
    R(c, P.steel, ox + 10, 24, 2, 8);
    R(c, P.out, ox + 4, 32, 5, 2);
    R(c, P.out, ox + 10, 32, 5, 2);
    // tabard + breastplate
    R(c, P.out, ox + 3, 12, 13, 13);
    R(c, P.steel, ox + 4, 13, 11, 11);
    R(c, P.steelL, ox + 4, 13, 11, 2);
    R(c, P.steelL, ox + 4, 13, 2, 9);
    R(c, P.red, ox + 8, 14, 3, 11);
    R(c, P.redD, ox + 10, 14, 1, 11);
    R(c, P.gold, ox + 8, 17, 3, 3);
    R(c, P.goldL, ox + 9, 18, 1, 1);
    R(c, P.out, ox + 4, 23, 11, 1);
    R(c, P.goldD, ox + 4, 23, 11, 1);
    // arms and pauldrons
    R(c, P.steelD, ox + 1, 13, 3, 9);
    R(c, P.steelD, ox + 15, 13, 3, 9);
    R(c, P.steelL, ox + 0, 12, 4, 3);
    R(c, P.steelL, ox + 15, 12, 4, 3);
    // helmet with visor and plume
    R(c, P.out, ox + 5, 2, 9, 11);
    R(c, P.steel, ox + 6, 3, 7, 9);
    R(c, P.steelL, ox + 6, 3, 2, 8);
    R(c, P.steelL, ox + 6, 3, 7, 1);
    R(c, P.out, ox + 6, 7, 7, 2);
    R(c, "#1b1b24", ox + 7, 7, 5, 1);
    R(c, P.out, ox + 9, 9, 1, 3);
    R(c, P.red, ox + 8, 0, 3, 3);
    R(c, P.redL, ox + 9, -1, 2, 2);
    R(c, P.redD, ox + 8, 2, 3, 1);
    // spear (right hand): pole, gold collar, blade
    R(c, P.out, ox + 19, 4, 3, 30);
    R(c, P.woodL, ox + 20, 6, 1, 28);
    R(c, P.steelL, ox + 19, 0, 3, 5);
    R(c, P.steel, ox + 20, 0, 1, 5);
    R(c, P.gold, ox + 19, 5, 3, 1);
    R(c, P.redL, ox + 17, 6, 3, 2);
    // shield (left hand)
    R(c, P.out, ox - 3, 14, 8, 12);
    R(c, P.blue, ox - 2, 15, 6, 9);
    R(c, P.blueL, ox - 2, 15, 6, 2);
    R(c, P.gold, ox, 16, 2, 8);
    R(c, P.gold, ox - 2, 19, 6, 2);
    R(c, P.out, ox - 1, 24, 4, 2);
    R(c, P.blueD, ox, 25, 2, 1);
  });
}

function armorStand(): Cv {
  return mk(16, 34, (c) => {
    ell(c, P.shadow, 8, 32, 7, 1);
    R(c, P.stoneD, 2, 28, 12, 5);
    R(c, P.stone, 3, 28, 10, 2);
    R(c, P.steelD, 5, 20, 3, 8);
    R(c, P.steelD, 9, 20, 3, 8);
    R(c, P.out, 3, 10, 11, 11);
    R(c, P.steel, 4, 11, 9, 9);
    R(c, P.steelL, 4, 11, 2, 8);
    R(c, P.goldD, 4, 19, 9, 1);
    R(c, P.steelD, 1, 11, 3, 8);
    R(c, P.steelD, 13, 11, 3, 8);
    R(c, P.out, 5, 1, 7, 10);
    R(c, P.steel, 6, 2, 5, 8);
    R(c, P.steelL, 6, 2, 2, 7);
    R(c, "#1b1b24", 7, 5, 4, 1);
    R(c, P.blue, 7, 0, 3, 2);
  });
}

// -------------------------------------------------------------- hall props
function pillar(): Cv {
  return mk(16, 66, (c) => {
    ell(c, P.shadow, 8, 64, 7, 1);
    R(c, P.out, 1, 56, 14, 9);
    R(c, P.marbleD, 2, 57, 12, 7);
    R(c, P.marble, 2, 57, 12, 2);
    R(c, P.out, 3, 8, 10, 49);
    R(c, P.marble, 4, 8, 8, 49);
    R(c, P.marbleD, 10, 8, 2, 49);
    R(c, "#ffffff", 5, 8, 1, 49);
    for (let y = 14; y < 54; y += 12) R(c, P.marbleD, 4, y, 8, 1);
    R(c, P.out, 0, 0, 16, 9);
    R(c, P.gold, 1, 1, 14, 7);
    R(c, P.goldL, 1, 1, 14, 2);
    R(c, P.goldD, 1, 6, 14, 2);
    R(c, P.goldD, 4, 3, 1, 3);
    R(c, P.goldD, 8, 3, 1, 3);
    R(c, P.goldD, 11, 3, 1, 3);
  });
}

function throne(): Cv {
  return mk(32, 46, (c) => {
    ell(c, P.shadow, 16, 44, 14, 2);
    // dais steps
    R(c, P.out, 0, 38, 32, 7);
    R(c, P.redD, 1, 39, 30, 5);
    R(c, P.red, 1, 39, 30, 2);
    R(c, P.out, 3, 34, 26, 5);
    R(c, P.red, 4, 35, 24, 3);
    // chair
    R(c, P.out, 6, 2, 20, 34);
    R(c, P.goldD, 7, 3, 18, 33);
    R(c, P.gold, 8, 4, 16, 18);
    R(c, P.goldL, 8, 4, 16, 2);
    // velvet back and seat
    R(c, P.redD, 10, 8, 12, 14);
    R(c, P.red, 11, 9, 10, 12);
    R(c, P.redL, 11, 9, 2, 11);
    R(c, P.out, 7, 22, 18, 3);
    R(c, P.gold, 8, 22, 16, 2);
    R(c, P.red, 9, 24, 14, 8);
    R(c, P.redL, 9, 24, 14, 2);
    R(c, P.goldD, 7, 31, 18, 3);
    // arms
    R(c, P.gold, 4, 20, 4, 14);
    R(c, P.gold, 24, 20, 4, 14);
    R(c, P.goldL, 4, 20, 4, 2);
    R(c, P.goldL, 24, 20, 4, 2);
    // crest on top
    R(c, P.gold, 13, 0, 6, 4);
    R(c, P.goldL, 14, 0, 4, 1);
    R(c, P.redL, 15, 1, 2, 2);
    R(c, P.gold, 11, 2, 2, 3);
    R(c, P.gold, 19, 2, 2, 3);
  });
}

function chandelier(): Cv {
  return mk(44, 40, (c) => {
    R(c, P.goldD, 21, 0, 2, 12);
    R(c, P.out, 17, 11, 10, 5);
    R(c, P.gold, 18, 12, 8, 3);
    // arms
    R(c, P.goldD, 6, 18, 32, 2);
    R(c, P.gold, 6, 17, 32, 1);
    R(c, P.goldD, 20, 14, 4, 6);
    R(c, P.goldD, 4, 19, 3, 6);
    R(c, P.goldD, 37, 19, 3, 6);
    R(c, P.goldD, 12, 19, 2, 6);
    R(c, P.goldD, 30, 19, 2, 6);
    for (const x of [4, 12, 21, 30, 37]) {
      R(c, P.out, x - 1, 16, 4, 4);
      R(c, P.paper, x, 11, 2, 6);
      R(c, P.gold, x - 1, 16, 4, 1);
    }
    // crystals
    for (const [x, y] of [[8, 26], [16, 28], [22, 31], [28, 28], [35, 26]]) {
      R(c, P.skyBlueL, x, y, 2, 4);
      R(c, "#ffffff", x, y, 1, 2);
    }
    R(c, P.goldD, 14, 24, 16, 1);
  });
}

// The grand double staircase on the Great Hall's back wall (128 x 76).
function grandStair(): Cv {
  return mk(128, 76, (c) => {
    // the landing at the top, with a doorway to the upper floor
    R(c, P.out, 8, 0, 112, 20);
    R(c, P.stoneD, 9, 1, 110, 18);
    R(c, P.stone, 9, 1, 110, 3);
    R(c, P.out, 50, 3, 28, 17);
    R(c, "#1d1530", 52, 5, 24, 15);
    R(c, P.goldD, 50, 2, 28, 3);
    R(c, P.gold, 50, 2, 28, 1);
    R(c, P.out, 56, 7, 16, 2);
    R(c, P.purpleD, 52, 5, 24, 4);
    // balcony balusters either side of the doorway
    for (const [x0, x1] of [[10, 48], [80, 118]]) {
      R(c, P.marble, x0, 8, x1 - x0, 2);
      R(c, P.marbleD, x0, 10, x1 - x0, 1);
      for (let x = x0 + 1; x < x1; x += 4) {
        R(c, P.marbleD, x, 11, 2, 7);
        R(c, P.marble, x, 11, 1, 7);
      }
      R(c, P.marble, x0, 18, x1 - x0, 2);
    }
    // steps: each is a lit tread over a darker riser, narrowing towards the top
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const y = 20 + i * 7;
      const inset = Math.round((steps - 1 - i) * 1.4);
      const x0 = 4 + (7 - i) * 0 + inset * 0;
      const w = 128 - 8 - (7 - i) * 0 - inset * 2 + (steps - 1 - i) * 0;
      const left = x0 + inset;
      R(c, P.out, left, y, w, 8);
      R(c, P.marble, left + 1, y + 1, w - 2, 3);
      R(c, P.marbleD, left + 1, y + 4, w - 2, 3);
      R(c, P.stoneL, left + 1, y + 7, w - 2, 1);
      // red carpet runner, a little narrower at the top
      const cw = 34 - (steps - 1 - i);
      const cx = 64 - cw / 2;
      R(c, P.redD, cx, y + 1, cw, 7);
      R(c, P.red, cx, y + 1, cw, 3);
      R(c, P.goldD, cx, y + 1, 1, 7);
      R(c, P.goldD, cx + cw - 1, y + 1, 1, 7);
    }
    // newel posts and slanted handrails
    for (const sx of [0, 1]) {
      const px = sx === 0 ? 0 : 118;
      R(c, P.out, px, 52, 10, 24);
      R(c, P.marble, px + 1, 54, 8, 21);
      R(c, P.marbleD, px + 6, 54, 2, 21);
      R(c, P.gold, px, 48, 10, 6);
      R(c, P.goldL, px + 1, 49, 8, 2);
      R(c, P.goldD, px + 1, 52, 8, 2);
      // rail climbing to the landing
      for (let i = 0; i < 28; i++) {
        const t = i / 27;
        const rx = Math.round(px + 5 + (sx === 0 ? 1 : -1) * t * 6);
        const ry = Math.round(50 - t * 36);
        R(c, P.gold, rx, ry, 2, 2);
        if (i % 4 === 0) R(c, P.marbleD, rx, ry + 2, 1, Math.round(60 - ry) > 0 ? Math.min(18, 76 - ry - 22) : 0);
      }
    }
  });
}

// ---------------------------------------------------------------- castle
function castle(): Cv {
  return mk(104, 108, (c) => {
    const brick = (x: number, y: number, w: number, h: number, base: string, dark: string, light: string) => {
      R(c, base, x, y, w, h);
      for (let yy = y + 3, row = 0; yy < y + h; yy += 4, row++) {
        R(c, dark, x, yy, w, 1);
        for (let xx = x + (row % 2) * 4; xx < x + w; xx += 8) R(c, dark, xx, yy - 3, 1, 3);
      }
      R(c, light, x, y, 1, h);
      R(c, dark, x + w - 1, y, 1, h);
    };
    ell(c, P.shadow, 52, 105, 50, 3);
    // central keep
    brick(26, 36, 52, 70, "#ecd592", "#c9a95a", "#f7e8b4");
    R(c, P.out, 24, 30, 56, 8);
    R(c, "#f7e8b4", 25, 31, 54, 6);
    for (let x = 25; x < 80; x += 9) R(c, "#c9a95a", x + 5, 28, 4, 4); // crenel gaps
    for (let x = 25; x < 80; x += 9) R(c, "#f7e8b4", x, 26, 5, 6);
    R(c, "#c9a95a", 25, 36, 54, 2);
    // purple banner and a gold crest above the door
    R(c, P.purpleD, 44, 44, 16, 20);
    R(c, P.purple, 45, 44, 14, 18);
    R(c, P.out, 44, 62, 16, 1);
    R(c, P.purple, 45, 62, 6, 4);
    R(c, P.purple, 53, 62, 6, 4);
    R(c, P.gold, 49, 47, 6, 2);
    R(c, P.gold, 50, 49, 4, 4);
    R(c, P.goldL, 50, 47, 1, 1);
    R(c, P.goldL, 53, 47, 1, 1);
    R(c, P.goldL, 49, 45, 6, 1);
    // windows
    for (const wx of [32, 66]) {
      R(c, P.out, wx, 46, 8, 14);
      R(c, "#fff0a0", wx + 1, 48, 6, 11);
      R(c, "#ffffff", wx + 1, 48, 2, 6);
      R(c, P.out, wx + 3, 47, 2, 13);
      R(c, P.out, wx + 1, 53, 6, 1);
      R(c, "#fff5cf", wx - 1, 60, 10, 2);
    }
    // great door: stone arch, wooden doors, gold studs
    R(c, P.out, 40, 74, 24, 32);
    R(c, "#fff5cf", 41, 72, 22, 4);
    R(c, P.out, 42, 76, 20, 30);
    R(c, P.woodD, 43, 77, 18, 29);
    R(c, P.wood, 44, 78, 8, 28);
    R(c, P.wood, 53, 78, 7, 28);
    R(c, P.out, 52, 77, 1, 29);
    R(c, P.woodL, 44, 78, 1, 28);
    R(c, P.goldD, 44, 84, 16, 2);
    R(c, P.goldD, 44, 96, 16, 2);
    for (const sx of [45, 49, 54, 58]) {
      R(c, P.gold, sx, 90, 2, 2);
      R(c, P.gold, sx, 100, 2, 2);
    }
    R(c, P.gold, 50, 91, 1, 4);
    R(c, P.gold, 53, 91, 1, 4);
    // two round towers with cone roofs and flags
    for (const tx of [0, 80]) {
      brick(tx, 28, 24, 78, "#ecd592", "#c9a95a", "#f7e8b4");
      R(c, "#c9a95a", tx, 28, 24, 2);
      R(c, P.out, tx - 1, 24, 26, 6);
      R(c, "#f7e8b4", tx, 25, 24, 4);
      // slit windows
      for (const wy of [44, 66]) {
        R(c, P.out, tx + 10, wy, 4, 10);
        R(c, "#fff0a0", tx + 11, wy + 1, 2, 8);
      }
      // roof
      for (let i = 0; i < 24; i++) {
        const w = 28 - Math.round(i * 1.1);
        const x0 = tx + 12 - Math.floor(w / 2);
        R(c, i % 4 === 0 ? P.goldD : P.gold, x0, 26 - i, w, 1);
        R(c, P.goldL, x0, 26 - i, Math.max(1, Math.round(w / 4)), 1);
      }
      R(c, P.out, tx + 11, 0, 2, 4);
      R(c, P.goldD, tx + 12, 0, 1, 12);
      R(c, P.red, tx + 13, 1, 6, 4);
      R(c, P.redL, tx + 13, 1, 6, 1);
    }
    // a little welcome mat and steps
    R(c, "#c9a95a", 38, 104, 28, 2);
    R(c, P.red, 44, 105, 16, 2);
  });
}

// ----------------------------------------------------------- kitchen props
function island(): Cv {
  return mk(52, 32, (c) => {
    ell(c, P.shadow, 26, 30, 24, 2);
    R(c, P.out, 0, 8, 52, 23);
    R(c, P.woodD, 1, 12, 50, 18);
    R(c, P.wood, 1, 12, 50, 14);
    R(c, P.woodL, 1, 12, 50, 1);
    for (const x of [3, 18, 33]) {
      R(c, P.woodD, x, 15, 14, 9);
      R(c, P.woodL, x + 1, 16, 12, 7);
      R(c, P.woodHi, x + 6, 19, 2, 1);
    }
    // marble top with things on it
    R(c, P.out, 0, 6, 52, 7);
    R(c, P.marble, 1, 7, 50, 4);
    R(c, P.marbleD, 1, 11, 50, 1);
    // mixing bowl
    R(c, P.out, 5, 2, 12, 6);
    R(c, P.blueL, 6, 3, 10, 4);
    R(c, P.paper, 7, 3, 8, 2);
    R(c, P.blueD, 6, 7, 10, 1);
    // rolling pin
    R(c, P.woodD, 22, 5, 14, 3);
    R(c, P.woodL, 24, 5, 10, 2);
    // eggs + flour sack
    R(c, P.paper, 40, 4, 3, 4);
    R(c, P.yellowL, 44, 5, 3, 3);
    R(c, P.marbleD, 38, 1, 11, 3);
  });
}

function fridge(): Cv {
  return mk(22, 42, (c) => {
    ell(c, P.shadow, 11, 40, 10, 1);
    R(c, P.out, 0, 0, 22, 41);
    R(c, P.skyBlueL, 1, 1, 20, 39);
    R(c, "#b8dcee", 1, 1, 20, 3);
    R(c, P.out, 1, 15, 20, 1);
    R(c, P.out, 17, 6, 2, 6);
    R(c, P.out, 17, 20, 2, 10);
    R(c, "#ffffff", 3, 3, 1, 10);
    R(c, P.skyBlue, 2, 38, 18, 2);
    // magnets
    R(c, P.red, 5, 20, 3, 3);
    R(c, P.yellow, 10, 24, 3, 3);
    R(c, P.paper, 5, 26, 5, 5);
  });
}

function pantry(): Cv {
  return mk(26, 44, (c) => {
    ell(c, P.shadow, 13, 42, 12, 1);
    R(c, P.out, 0, 0, 26, 43);
    R(c, P.woodD, 1, 1, 24, 41);
    R(c, P.woodL, 1, 1, 24, 2);
    const items = [P.red, P.yellow, P.leaf, P.blueL, P.paper, P.redL, P.goldL];
    [4, 17, 30].forEach((y, row) => {
      R(c, "#4a3228", 3, y, 20, 10);
      R(c, P.wood, 2, y + 10, 22, 2);
      for (let i = 0; i < 5; i++) {
        const col = items[(i + row * 2) % items.length];
        R(c, P.out, 4 + i * 4, y + 2, 4, 8);
        R(c, col, 5 + i * 4, y + 3, 2, 6);
        R(c, "rgba(255,255,255,0.45)", 5 + i * 4, y + 3, 1, 5);
      }
    });
  });
}

// ------------------------------------------------------- living-room props
function sofaBack(): Cv {
  // seen from behind: a wide back with the cushions peeking over
  return mk(64, 30, (c) => {
    ell(c, P.shadow, 32, 28, 30, 2);
    R(c, P.out, 0, 8, 64, 21);
    R(c, P.blueD, 1, 9, 62, 19);
    R(c, P.blue, 4, 9, 56, 17);
    R(c, P.blueL, 4, 9, 56, 2);
    for (const x of [20, 40]) R(c, P.blueD, x, 11, 1, 15);
    for (let x = 8; x < 58; x += 8) R(c, P.blueL, x, 15, 1, 1);
    R(c, P.out, 0, 14, 7, 15);
    R(c, P.out, 57, 14, 7, 15);
    R(c, P.blue, 1, 14, 5, 13);
    R(c, P.blue, 58, 14, 5, 13);
    R(c, P.goldD, 4, 28, 4, 2);
    R(c, P.goldD, 56, 28, 4, 2);
    // two cushions and someone's blanket
    R(c, P.out, 12, 2, 11, 8);
    R(c, P.yellow, 13, 3, 9, 6);
    R(c, P.yellowL, 13, 3, 9, 2);
    R(c, P.out, 41, 2, 11, 8);
    R(c, P.redL, 42, 3, 9, 6);
    R(c, "#f0a0a8", 42, 3, 9, 2);
  });
}

function armchair(): Cv {
  return mk(26, 30, (c) => {
    ell(c, P.shadow, 13, 28, 11, 2);
    R(c, P.out, 1, 7, 24, 21);
    R(c, P.purpleD, 2, 8, 22, 19);
    R(c, P.purple, 5, 8, 16, 14);
    R(c, P.purpleL, 5, 8, 16, 2);
    R(c, P.out, 0, 12, 6, 15);
    R(c, P.out, 20, 12, 6, 15);
    R(c, P.purple, 1, 12, 4, 13);
    R(c, P.purple, 21, 12, 4, 13);
    R(c, P.goldD, 3, 27, 3, 2);
    R(c, P.goldD, 20, 27, 3, 2);
  });
}

function coffeeTable(): Cv {
  return mk(34, 18, (c) => {
    ell(c, P.shadow, 17, 16, 15, 2);
    R(c, P.out, 1, 4, 32, 10);
    R(c, P.woodHi, 2, 5, 30, 3);
    R(c, P.wood, 2, 8, 30, 5);
    R(c, P.out, 3, 13, 3, 4);
    R(c, P.out, 28, 13, 3, 4);
    // snacks + tea
    R(c, P.out, 5, 1, 7, 5);
    R(c, P.paper, 6, 2, 5, 3);
    R(c, P.woodL, 7, 0, 3, 2);
    R(c, P.out, 15, 2, 6, 4);
    R(c, P.blueL, 16, 3, 4, 2);
    R(c, P.out, 24, 1, 6, 5);
    R(c, P.redL, 25, 2, 4, 2);
    R(c, P.yellowL, 26, 0, 2, 2);
  });
}

// A flat TV on a console. The picture is drawn live into SCREEN each frame.
export const TV_SCREEN = { x: 4, y: 3, w: 48, h: 30 };
function tvStand(): Cv {
  return mk(56, 54, (c) => {
    ell(c, P.shadow, 28, 52, 26, 2);
    // console table
    R(c, P.out, 0, 36, 56, 17);
    R(c, P.woodD, 1, 40, 54, 12);
    R(c, P.wood, 1, 37, 54, 4);
    R(c, P.woodHi, 1, 37, 54, 1);
    R(c, P.woodL, 4, 43, 22, 8);
    R(c, P.woodL, 30, 43, 22, 8);
    R(c, P.goldD, 14, 46, 3, 1);
    R(c, P.goldD, 39, 46, 3, 1);
    // set top box + a tiny plant
    R(c, P.out, 38, 33, 12, 4);
    R(c, P.steelD, 39, 34, 10, 2);
    R(c, P.red, 46, 34, 1, 1);
    // the screen
    R(c, P.out, 2, 1, 52, 36);
    R(c, "#1b1b24", 4, 3, 48, 30);
    R(c, P.steelD, 22, 35, 12, 2);
    R(c, P.out, 18, 36, 20, 2);
  });
}

function piano(): Cv {
  return mk(44, 44, (c) => {
    ell(c, P.shadow, 22, 42, 20, 2);
    R(c, P.out, 0, 4, 44, 38);
    R(c, "#2a2230", 1, 5, 42, 20);
    R(c, "#46395a", 1, 5, 42, 3);
    // sheet music
    R(c, P.paper, 15, 8, 14, 9);
    for (const y of [10, 12, 14]) R(c, "#8a7a5a", 17, y, 10, 1);
    // keys
    R(c, P.out, 1, 25, 42, 12);
    R(c, P.marble, 2, 26, 40, 10);
    for (let x = 6; x < 42; x += 4) R(c, P.marbleD, x, 26, 1, 10);
    for (let x = 5; x < 40; x += 4) {
      if ((x - 5) % 12 === 8) continue;
      R(c, "#1b1b24", x, 26, 3, 6);
    }
    R(c, "#2a2230", 1, 37, 42, 4);
    R(c, P.out, 4, 40, 4, 4);
    R(c, P.out, 36, 40, 4, 4);
    R(c, P.gold, 20, 38, 4, 2);
  });
}

function bigPlant(): Cv {
  return mk(20, 36, (c) => {
    ell(c, P.shadow, 10, 34, 8, 1);
    R(c, P.out, 4, 24, 12, 11);
    R(c, P.redD, 5, 25, 10, 9);
    R(c, P.red, 5, 25, 10, 3);
    R(c, P.goldD, 4, 27, 12, 1);
    for (const [x, y, w, h] of [[3, 8, 5, 16], [8, 2, 5, 22], [12, 9, 5, 15], [1, 14, 4, 10], [15, 15, 4, 9]]) {
      R(c, P.leafD, x, y, w, h);
      R(c, P.leaf, x, y, w - 1, h - 2);
      R(c, "#8fc46a", x, y, 1, h - 4);
    }
  });
}

// ----------------------------------------------------- bedroom / flowers
function vaseFlowers(): Cv {
  return mk(14, 20, (c) => {
    ell(c, P.shadow, 7, 18, 5, 1);
    R(c, P.out, 4, 10, 7, 9);
    R(c, P.skyBlueL, 5, 11, 5, 7);
    R(c, "#ffffff", 5, 11, 1, 5);
    R(c, P.skyBlue, 5, 17, 5, 1);
    R(c, P.leafD, 7, 5, 1, 6);
    R(c, P.leafD, 5, 6, 1, 5);
    R(c, P.leafD, 10, 6, 1, 5);
    bloom(c, 6, 2, P.yellow, P.yellowL);
    bloom(c, 3, 4, P.skyBlue, "#ffffff");
    bloom(c, 9, 4, P.yellow, P.yellowL);
    bloom(c, 5, 0, P.skyBlue, "#ffffff");
    R(c, P.leaf, 4, 8, 2, 1);
    R(c, P.leaf, 9, 8, 2, 1);
  });
}

function flowerPot(): Cv {
  return mk(18, 28, (c) => {
    ell(c, P.shadow, 9, 26, 7, 1);
    R(c, P.out, 3, 18, 12, 9);
    R(c, P.wood, 4, 19, 10, 7);
    R(c, P.woodL, 4, 19, 10, 2);
    R(c, P.woodD, 4, 25, 10, 1);
    for (const x of [5, 8, 11]) R(c, P.leafD, x + 1, 8, 1, 11);
    R(c, P.leaf, 3, 15, 3, 2);
    R(c, P.leaf, 12, 14, 3, 2);
    bloom(c, 4, 6, P.yellow, P.yellowL);
    bloom(c, 7, 2, P.skyBlue, "#ffffff");
    bloom(c, 10, 6, P.yellow, P.yellowL);
    bloom(c, 7, 9, P.skyBlue, "#ffffff");
    bloom(c, 2, 11, P.skyBlue, "#ffffff");
    bloom(c, 12, 10, P.yellow, P.yellowL);
  });
}

function royalBed(): Cv {
  return mk(48, 52, (c) => {
    ell(c, P.shadow, 24, 50, 22, 2);
    // carved headboard
    R(c, P.out, 2, 0, 44, 16);
    R(c, P.woodD, 3, 1, 42, 14);
    R(c, P.wood, 3, 1, 42, 4);
    R(c, P.goldD, 3, 5, 42, 1);
    for (const x of [8, 20, 32]) {
      R(c, P.woodL, x, 7, 8, 7);
      R(c, P.wood, x + 1, 8, 6, 5);
    }
    // posts with finials
    for (const x of [0, 44]) {
      R(c, P.out, x, 0, 4, 52);
      R(c, P.woodD, x + 1, 1, 2, 50);
      R(c, P.gold, x, 0, 4, 3);
      R(c, P.goldL, x + 1, 0, 2, 1);
    }
    // mattress, pillows, a blue quilt scattered with yellow flowers
    R(c, P.out, 3, 14, 42, 36);
    R(c, P.paper, 4, 15, 40, 8);
    R(c, P.out, 7, 16, 14, 7);
    R(c, "#ffffff", 8, 17, 12, 5);
    R(c, P.marbleD, 8, 21, 12, 1);
    R(c, P.out, 26, 16, 14, 7);
    R(c, "#ffffff", 27, 17, 12, 5);
    R(c, P.marbleD, 27, 21, 12, 1);
    R(c, P.blue, 4, 24, 40, 25);
    R(c, P.blueL, 4, 24, 40, 3);
    R(c, P.blueD, 4, 46, 40, 3);
    for (const [x, y] of [[8, 29], [18, 34], [30, 30], [38, 38], [12, 40], [26, 41], [35, 27]]) {
      bloom(c, x, y, P.yellow, P.yellowL);
    }
    R(c, P.goldD, 4, 24, 40, 1);
  });
}

function nightstand(): Cv {
  return mk(20, 24, (c) => {
    ell(c, P.shadow, 10, 22, 9, 1);
    R(c, P.out, 1, 8, 18, 15);
    R(c, P.woodHi, 2, 9, 16, 2);
    R(c, P.wood, 2, 11, 16, 11);
    R(c, P.woodL, 4, 13, 12, 7);
    R(c, P.goldD, 9, 16, 2, 1);
  });
}

function wardrobe(): Cv {
  return mk(34, 52, (c) => {
    ell(c, P.shadow, 17, 50, 15, 2);
    R(c, P.out, 0, 0, 34, 50);
    R(c, P.woodD, 1, 1, 32, 48);
    R(c, P.woodL, 1, 1, 32, 3);
    R(c, P.goldD, 1, 4, 32, 1);
    R(c, P.wood, 3, 7, 13, 39);
    R(c, P.wood, 18, 7, 13, 39);
    R(c, P.woodL, 4, 8, 11, 37);
    R(c, P.woodL, 19, 8, 11, 37);
    R(c, P.wood, 6, 12, 7, 12);
    R(c, P.wood, 21, 12, 7, 12);
    R(c, P.wood, 6, 28, 7, 14);
    R(c, P.wood, 21, 28, 7, 14);
    R(c, P.gold, 14, 24, 2, 4);
    R(c, P.gold, 18, 24, 2, 4);
    R(c, P.out, 16, 7, 2, 39);
  });
}

function mirror(): Cv {
  return mk(22, 44, (c) => {
    ell(c, P.shadow, 11, 42, 9, 1);
    R(c, P.out, 2, 0, 18, 36);
    R(c, P.gold, 3, 1, 16, 34);
    R(c, P.goldL, 3, 1, 16, 2);
    R(c, P.skyBlueL, 5, 4, 12, 28);
    R(c, "#d6ecfb", 5, 4, 12, 4);
    R(c, "#ffffff", 7, 8, 2, 12);
    R(c, "#ffffff", 7, 22, 2, 2);
    R(c, P.out, 3, 35, 4, 7);
    R(c, P.out, 15, 35, 4, 7);
    R(c, P.goldD, 4, 36, 2, 5);
    R(c, P.goldD, 16, 36, 2, 5);
  });
}

// ------------------------------------------------------------- study props
function bookcase(variant: number): Cv {
  const palettes = [
    ["#bd757e", "#7180b1", "#78a158", "#e8b66a", "#a35b70", "#4a588e"],
    ["#c0392b", "#27ae60", "#f1c40f", "#2980b9", "#8e44ad", "#d35400"],
    ["#6b4c9a", "#d9545c", "#e2b43c", "#3d4f9f", "#5f9a4a", "#aa7959"],
  ];
  const cols = palettes[variant % palettes.length];
  return mk(48, 64, (c) => {
    ell(c, P.shadow, 24, 62, 22, 2);
    R(c, P.out, 0, 0, 48, 63);
    R(c, P.woodD, 1, 1, 46, 61);
    R(c, P.woodL, 1, 1, 46, 2);
    R(c, P.goldD, 1, 3, 46, 1);
    [5, 21, 37].forEach((y, row) => {
      R(c, "#3a2820", 3, y, 42, 14);
      R(c, P.wood, 2, y + 14, 44, 2);
      let x = 4;
      let i = row * 5 + variant * 3;
      while (x < 42) {
        const w = 3 + ((i * 7) % 3);
        const h = 8 + ((i * 5) % 6);
        const col = cols[i % cols.length];
        R(c, P.out, x - 1, y + 14 - h - 1, w + 2, h + 1);
        R(c, col, x, y + 14 - h, w, h);
        R(c, "rgba(255,255,255,0.3)", x, y + 14 - h, 1, h);
        R(c, P.goldL, x, y + 14 - h + 2, w, 1);
        if (i % 4 === 0) R(c, P.goldL, x + 1, y + 14 - h + 5, w - 2, 1);
        x += w + 1;
        i++;
      }
    });
  });
}

function ladder(): Cv {
  return mk(14, 50, (c) => {
    ell(c, P.shadow, 7, 48, 6, 1);
    R(c, P.out, 1, 0, 3, 49);
    R(c, P.out, 10, 0, 3, 49);
    R(c, P.woodL, 2, 1, 1, 47);
    R(c, P.woodL, 11, 1, 1, 47);
    for (let y = 6; y < 46; y += 8) {
      R(c, P.out, 3, y, 8, 3);
      R(c, P.wood, 3, y, 8, 2);
    }
  });
}

function readingDesk(): Cv {
  return mk(56, 40, (c) => {
    ell(c, P.shadow, 28, 38, 26, 2);
    R(c, P.out, 0, 12, 56, 26);
    R(c, P.woodHi, 1, 13, 54, 3);
    R(c, P.wood, 1, 16, 54, 21);
    R(c, P.woodD, 1, 34, 54, 3);
    R(c, P.woodL, 4, 19, 22, 14);
    R(c, P.woodL, 30, 19, 22, 14);
    R(c, P.goldD, 14, 25, 3, 1);
    R(c, P.goldD, 39, 25, 3, 1);
    // open book, inkwell and quill, a candle lamp
    R(c, P.out, 12, 7, 20, 8);
    R(c, P.paper, 13, 8, 9, 6);
    R(c, P.paper, 22, 8, 9, 6);
    R(c, P.woodD, 22, 7, 1, 8);
    for (const y of [9, 11, 13]) {
      R(c, "#a89a78", 14, y, 7, 1);
      R(c, "#a89a78", 24, y, 6, 1);
    }
    R(c, P.out, 38, 8, 5, 6);
    R(c, P.blueD, 39, 9, 3, 4);
    R(c, P.paper, 42, 2, 2, 8);
    R(c, P.out, 46, 4, 6, 10);
    R(c, P.yellowL, 47, 0, 3, 5);
    R(c, P.goldL, 48, 0, 1, 2);
    R(c, P.out, 46, 11, 6, 2);
  });
}

function diningTable(): Cv {
  return mk(60, 34, (c) => {
    ell(c, P.shadow, 30, 32, 28, 2);
    // legs
    for (const x of [3, 53]) {
      R(c, P.out, x, 20, 5, 13);
      R(c, P.woodD, x + 1, 20, 3, 12);
    }
    // top, with a white runner and blue stripes
    R(c, P.out, 0, 8, 60, 16);
    R(c, P.woodHi, 1, 9, 58, 4);
    R(c, P.woodL, 1, 13, 58, 9);
    R(c, P.woodD, 1, 22, 58, 1);
    R(c, P.paper, 6, 11, 48, 8);
    R(c, P.blueL, 6, 11, 48, 1);
    R(c, P.blueL, 6, 18, 48, 1);
    // candles at either end and a jug of flowers
    R(c, P.out, 9, 4, 4, 8);
    R(c, P.paper, 10, 5, 2, 6);
    R(c, P.yellowL, 10, 2, 2, 3);
    R(c, P.out, 47, 4, 4, 8);
    R(c, P.paper, 48, 5, 2, 6);
    R(c, P.yellowL, 48, 2, 2, 3);
    // table cloth edge
    for (let x = 6; x < 54; x += 4) R(c, P.blueD, x, 19, 2, 1);
  });
}

function globe(): Cv {
  return mk(22, 30, (c) => {
    ell(c, P.shadow, 11, 28, 8, 1);
    R(c, P.out, 9, 20, 4, 8);
    R(c, P.woodD, 10, 21, 2, 6);
    R(c, P.out, 5, 26, 12, 3);
    R(c, P.wood, 6, 26, 10, 2);
    ell(c, P.out, 11, 11, 10, 10);
    ell(c, P.skyBlue, 11, 11, 9, 9);
    R(c, P.leaf, 6, 6, 5, 4);
    R(c, P.leaf, 12, 9, 5, 6);
    R(c, P.leafD, 8, 14, 3, 3);
    R(c, P.skyBlueL, 5, 5, 2, 3);
    R(c, P.goldD, 1, 3, 2, 16);
    R(c, P.goldD, 19, 3, 2, 16);
    R(c, P.goldD, 3, 1, 16, 2);
  });
}

function bookStack(): Cv {
  return mk(18, 14, (c) => {
    ell(c, P.shadow, 9, 13, 8, 1);
    const books: [string, number, number][] = [[P.red, 0, 9], [P.blue, 2, 6], [P.leaf, 1, 3]];
    for (const [col, off, y] of books) {
      R(c, P.out, off, y, 16 - off, 5);
      R(c, col, off + 1, y + 1, 14 - off, 3);
      R(c, P.paper, off + 1, y + 4, 14 - off, 1);
      R(c, P.goldL, off + 3, y + 2, 4, 1);
    }
  });
}

function royalRug(w: number, h: number, a: string, b: string): Cv {
  return mk(w, h, (c) => {
    R(c, P.out, 0, 0, w, h);
    R(c, a, 1, 1, w - 2, h - 2);
    R(c, P.gold, 3, 3, w - 6, h - 6);
    R(c, b, 4, 4, w - 8, h - 8);
    R(c, a, 8, 8, w - 16, h - 16);
    for (let x = 12; x < w - 12; x += 10) {
      R(c, P.goldL, x, Math.floor(h / 2) - 1, 3, 3);
    }
    for (let x = 1; x < w; x += 3) {
      R(c, P.paper, x, 0, 1, 1);
      R(c, P.paper, x, h - 1, 1, 1);
    }
  });
}

function carpetRunner(w: number, h: number): Cv {
  return mk(w, h, (c) => {
    R(c, P.redD, 0, 0, w, h);
    R(c, P.red, 3, 0, w - 6, h);
    R(c, P.gold, 1, 0, 1, h);
    R(c, P.gold, w - 2, 0, 1, h);
    R(c, P.goldD, 2, 0, 1, h);
    R(c, P.goldD, w - 3, 0, 1, h);
    for (let y = 4; y < h; y += 12) {
      R(c, P.redL, Math.floor(w / 2) - 1, y, 3, 3);
      R(c, P.goldL, Math.floor(w / 2), y + 1, 1, 1);
    }
  });
}

// --------------------------------------------------------------- dishes
function dish(base: string, top: string, bits: string[], big = false): Cv {
  return mk(12, 10, (c) => {
    ell(c, P.shadow, 6, 9, 5, 1);
    R(c, P.out, 1, 4, 10, 5);
    R(c, P.paper, 2, 5, 8, 3);
    R(c, P.out, 2, 8, 8, 1);
    R(c, base, 2, 3, 8, 3);
    R(c, top, 3, 2, 6, 2);
    bits.forEach((b, i) => R(c, b, 3 + i * 2, big ? 0 : 1, 2, 2));
    R(c, "#ffffff", 3, 5, 2, 1);
  });
}

// ------------------------------------------------------------ street decor
function planter(): Cv {
  return mk(28, 18, (c) => {
    ell(c, P.shadow, 14, 16, 12, 1);
    const cols: [string, string][] = [
      [P.yellow, P.yellowL],
      [P.skyBlue, "#ffffff"],
      ["#f0a0b0", "#ffd6dc"],
      [P.yellow, P.yellowL],
      [P.skyBlue, "#ffffff"],
      ["#f0a0b0", "#ffd6dc"],
    ];
    for (let i = 0; i < 6; i++) {
      R(c, P.leafD, 4 + i * 4, 6 + (i % 2), 3, 5);
      R(c, P.leaf, 4 + i * 4, 5 + (i % 2), 3, 3);
      bloom(c, 4 + i * 4, 1 + (i % 3), cols[i][0], cols[i][1]);
    }
    R(c, P.out, 1, 9, 26, 8);
    R(c, P.woodHi, 2, 10, 24, 1);
    R(c, P.wood, 2, 11, 24, 5);
    R(c, P.woodD, 2, 15, 24, 1);
    for (const x of [8, 14, 20]) R(c, P.woodD, x, 11, 1, 5);
    R(c, P.goldD, 1, 12, 26, 1);
  });
}

function barrel(): Cv {
  return mk(16, 20, (c) => {
    ell(c, P.shadow, 8, 18, 7, 1);
    R(c, P.out, 1, 3, 14, 15);
    R(c, P.wood, 2, 4, 12, 13);
    R(c, P.woodL, 3, 4, 3, 13);
    R(c, P.woodD, 11, 4, 3, 13);
    R(c, P.goldD, 1, 6, 14, 2);
    R(c, P.goldD, 1, 13, 14, 2);
    ell(c, P.out, 8, 4, 7, 2);
    ell(c, P.woodHi, 8, 4, 6, 1);
    R(c, P.woodD, 5, 4, 6, 1);
  });
}

function crate(): Cv {
  return mk(16, 16, (c) => {
    ell(c, P.shadow, 8, 15, 7, 1);
    R(c, P.out, 1, 4, 14, 11);
    R(c, P.wood, 2, 5, 12, 9);
    R(c, P.woodL, 2, 5, 12, 2);
    R(c, P.woodD, 2, 9, 12, 1);
    R(c, P.woodD, 7, 5, 1, 9);
    R(c, P.red, 3, 2, 4, 4);
    R(c, P.redL, 4, 2, 1, 1);
    R(c, P.yellow, 8, 2, 4, 4);
    R(c, P.yellowL, 9, 2, 1, 1);
    R(c, P.leafD, 6, 1, 2, 2);
  });
}

function stall(): Cv {
  return mk(52, 50, (c) => {
    ell(c, P.shadow, 26, 48, 24, 2);
    for (const x of [3, 46]) {
      R(c, P.out, x, 8, 4, 40);
      R(c, P.woodL, x + 1, 8, 2, 39);
    }
    R(c, P.out, 0, 0, 52, 16);
    for (let i = 0; i < 13; i++) {
      const col = i % 2 ? P.paper : P.gold;
      R(c, col, 1 + i * 4, 1, 4, 12);
      R(c, i % 2 ? P.marbleD : P.goldD, 1 + i * 4, 11, 4, 1);
      R(c, col, 1 + i * 4, 13, 4, 2);
      R(c, col, 2 + i * 4, 15, 2, 1);
    }
    R(c, P.goldL, 1, 1, 50, 1);
    R(c, P.out, 4, 30, 44, 17);
    R(c, P.woodD, 5, 31, 42, 15);
    R(c, P.woodHi, 5, 31, 42, 2);
    R(c, P.wood, 5, 33, 42, 12);
    for (const x of [16, 28, 40]) R(c, P.woodD, x, 33, 1, 12);
    const fruit: [number, string][] = [[7, P.red], [11, P.red], [15, P.yellow], [19, P.yellow], [23, P.leaf], [27, P.leaf]];
    for (const [x, col] of fruit) {
      R(c, P.out, x, 25, 4, 5);
      R(c, col, x + 1, 26, 2, 3);
    }
    for (const [x, col] of [[33, "#bd757e"], [38, P.skyBlueL], [43, P.yellow]] as [number, string][]) {
      R(c, P.out, x, 22, 4, 8);
      R(c, col, x + 1, 24, 2, 5);
      R(c, P.woodHi, x + 1, 21, 2, 2);
    }
    for (let i = 0; i < 6; i++) R(c, [P.redL, P.yellow, P.skyBlue][i % 3], 8 + i * 7, 17, 3, 3);
  });
}

function topiary(): Cv {
  return mk(20, 34, (c) => {
    ell(c, P.shadow, 10, 32, 8, 1);
    R(c, P.out, 4, 22, 12, 10);
    R(c, P.gold, 5, 23, 10, 8);
    R(c, P.goldL, 5, 23, 10, 2);
    R(c, P.goldD, 5, 29, 10, 2);
    R(c, P.woodD, 9, 17, 2, 7);
    ell(c, P.out, 10, 10, 9, 9);
    ell(c, P.leafD, 10, 10, 8, 8);
    ell(c, P.leaf, 9, 9, 7, 7);
    ell(c, "#8fc46a", 7, 6, 3, 3);
    for (const [x, y] of [[4, 8], [8, 14], [13, 5], [15, 12], [6, 3], [11, 10]]) {
      R(c, P.goldL, x, y, 2, 2);
      R(c, "#fff6b0", x, y, 1, 1);
    }
  });
}

function well(): Cv {
  return mk(30, 38, (c) => {
    ell(c, P.shadow, 15, 36, 13, 2);
    R(c, P.out, 3, 20, 24, 16);
    R(c, P.stone, 4, 21, 22, 14);
    R(c, P.stoneL, 4, 21, 22, 3);
    for (let y = 25; y < 35; y += 4) {
      R(c, P.stoneD, 4, y, 22, 1);
      for (let x = 4 + ((y / 4) % 2) * 5; x < 26; x += 10) R(c, P.stoneD, x, y - 3, 1, 3);
    }
    R(c, "#3a6a9a", 8, 22, 14, 3);
    for (const x of [4, 24]) {
      R(c, P.out, x, 6, 3, 16);
      R(c, P.woodL, x + 1, 6, 1, 15);
    }
    R(c, P.out, 0, 2, 30, 6);
    R(c, P.gold, 1, 3, 28, 3);
    R(c, P.goldL, 1, 3, 28, 1);
    R(c, P.goldD, 1, 5, 28, 1);
    R(c, P.out, 14, 8, 2, 8);
    R(c, P.woodD, 12, 14, 6, 5);
    R(c, P.wood, 13, 14, 4, 3);
  });
}

export function palaceProps(): Record<string, Cv | Cv[]> {
  const kn = knightSprite();
  return {
    knight: kn,
    knightM: flip(kn),
    armorStand: armorStand(),
    pillar: pillar(),
    throne: throne(),
    chandelier: chandelier(),
    grandStair: grandStair(),
    castle: castle(),
    island: island(),
    fridge: fridge(),
    pantry: pantry(),
    sofaBack: sofaBack(),
    armchair: armchair(),
    coffeeTable: coffeeTable(),
    tvStand: tvStand(),
    piano: piano(),
    bigPlant: bigPlant(),
    vaseFlowers: vaseFlowers(),
    flowerPot: flowerPot(),
    royalBed: royalBed(),
    nightstand: nightstand(),
    wardrobe: wardrobe(),
    mirror: mirror(),
    bookcase0: bookcase(0),
    bookcase1: bookcase(1),
    bookcase2: bookcase(2),
    ladder: ladder(),
    readingDesk: readingDesk(),
    globe: globe(),
    diningTable: diningTable(),
    planter: planter(),
    barrel: barrel(),
    crate: crate(),
    stall: stall(),
    topiary: topiary(),
    well: well(),
    f_welcome: carpetRunner(36, 30),
    bookStack: bookStack(),
    f_rugRoyal: royalRug(88, 48, P.blueD, P.blue),
    f_rugFloral: royalRug(72, 40, P.blue, P.yellowL),
    f_rugStudy: royalRug(64, 34, P.redD, P.red),
    f_runner: carpetRunner(36, 120),
    f_runnerShort: carpetRunner(32, 40),
    dishCupcake: dish("#f0a0a8", "#ffffff", ["#d9545c"], true),
    dishTart: dish("#e2b43c", "#f7dd7a", ["#f6cf3f", "#f6cf3f"]),
    dishCookies: dish("#aa7959", "#d79e61", ["#4a2f22", "#4a2f22", "#4a2f22"]),
    dishRamen: dish("#e8b66a", "#f3e5c2", ["#f6cf3f", "#5f9a4a", "#d9545c"], true),
    dishBiryani: dish("#e2b43c", "#f7dd7a", ["#d9545c", "#5f9a4a", "#ffffff"], true),
  };
}
