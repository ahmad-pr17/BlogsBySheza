import { mulberry32 } from "@/components/game/rng";

export const T = 16; // tile size in logical pixels
export const COLS = 44;
const R0 = 24; // row of the first post sign
const GAP = 12; // rows between post signs

export type Stop = {
  slug: string;
  title: string;
  date: string;
  category: string;
  isNew?: boolean; // published in the last week
};

export type Interact = {
  id: string;
  // post: opens a post; link: router push; modal: popup; enter: go into the
  // Home; act: something to do indoors (see GameWorld's handleAct)
  kind: "post" | "link" | "modal" | "enter" | "act";
  act?: string;
  hitDy?: number; // click target centre, px above signY (default 14)
  hitR?: number; // click target radius (default 20)
  label: string; // text on the sign tag
  verb: string; // text on the action prompt
  slug?: string;
  href?: string;
  modal?: string; // node key shown in the popup (kind "modal")
  signX: number; // sign / prop base (px)
  signY: number;
  spotX: number; // where auto-walk heads (px)
  spotY: number;
};

export type Obj = {
  key: string;
  x: number; // anchor: bottom-centre, world px
  y: number;
  flat?: boolean; // drawn on the ground, below everything
  interact?: string;
  lift?: number; // draw this many px higher than the sort position (things on tables)
};

export type World = {
  cols: number;
  rows: number;
  w: number;
  h: number;
  kind: Uint8Array; // 0 grass, 1 path, 2 water
  blocked: Uint8Array;
  objects: Obj[];
  interacts: Interact[];
  start: { x: number; y: number };
};

// Centre line of the trail (in tiles) for a row; straight near the campfire.
export function pathCenter(row: number) {
  const damp = Math.min(1, Math.max(0, (row - 10) / 12));
  return COLS / 2 + damp * (Math.sin(row / 7) * 5.5 + Math.sin(row / 3.1) * 1.1);
}

const PATH_HALF = 1.9;

export function buildWorld(stops: Stop[], adminHouse = false, canEdit = false): World {
  const n = stops.length;
  const lastRow = R0 + Math.max(n - 1, 0) * GAP;
  const endRow = lastRow + GAP;
  const rows = endRow + 12;
  const kind = new Uint8Array(COLS * rows);
  const blocked = new Uint8Array(COLS * rows);
  const reserved = new Uint8Array(COLS * rows);
  const objects: Obj[] = [];
  const interacts: Interact[] = [];
  const rand = mulberry32(0xbeef01);
  const at = (c: number, r: number) => r * COLS + c;
  const inB = (c: number, r: number) => c >= 0 && r >= 0 && c < COLS && r < rows;

  const block = (c: number, r: number) => {
    if (inB(c, r)) blocked[at(c, r)] = 1;
  };
  const reserve = (c0: number, r0: number, c1: number, r1: number) => {
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) if (inB(c, r)) reserved[at(c, r)] = 1;
  };

  // The trail.
  for (let r = 10; r <= endRow + 6; r++)
    for (let c = 0; c < COLS; c++)
      if (Math.abs(c + 0.5 - pathCenter(r)) <= PATH_HALF) kind[at(c, r)] = 1;
  reserve(0, 0, COLS - 1, 0);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < COLS; c++) if (kind[at(c, r)] === 1) reserved[at(c, r)] = 1;

  // World border is solid.
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < COLS; c++)
      if (c < 2 || r < 2 || c >= COLS - 2 || r >= rows - 2) block(c, r);

  const place = (
    key: string,
    cx: number, // tile centre, may be fractional
    row: number, // tile row the base sits on
    opts: { flat?: boolean; blockTiles?: [number, number][]; interact?: string } = {},
  ) => {
    const x = cx * T;
    const y = (row + 1) * T;
    objects.push({ key, x, y, flat: opts.flat, interact: opts.interact });    for (const [c, r] of opts.blockTiles ?? []) block(c, r);
  };

  // ---- the town: five houses along a street, facing a dirt square ----
  const HOUSE_ROW = 7; // tile row the houses stand on
  const setPath = (c0: number, r0: number, c1: number, r1: number) => {
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) if (inB(c, r)) kind[at(c, r)] = 1;
  };
  setPath(8, 8, 36, 10); // main street
  setPath(14, 9, 30, 13); // town square
  reserve(5, 2, 39, 14);
  // the strip behind the houses is out of bounds
  for (let r = 2; r <= 5; r++) for (let c = 5; c <= 39; c++) block(c, r);

  const houses: { c: number; key: string; id?: string; label?: string; verb?: string }[] = [
    { c: 10, key: "houseG" },
    { c: 16, key: "house", id: "about", label: "About", verb: "Visit the About house" },
    { c: 22, key: "home", id: "home", label: "Sheza's Palace", verb: "Enter Sheza's Palace" },
    { c: 28, key: "houseAlt", id: "admin", label: "Admin", verb: "Enter the Admin house" },
    { c: 34, key: "houseC" },
  ];
  for (const h of houses) {
    // The Admin house is only a real door for the owner and superadmin; for
    // visitors it is just another house (no sign, nothing to enter).
    const live = !!h.id && (h.id !== "admin" || adminHouse);
    const isCastle = h.key === "home";
    place(h.key, h.c, HOUSE_ROW, {
      blockTiles: (isCastle ? [h.c - 3, h.c - 2, h.c - 1, h.c, h.c + 1, h.c + 2] : [h.c - 2, h.c - 1, h.c, h.c + 1]).flatMap(
        (c) => [[c, HOUSE_ROW - 1], [c, HOUSE_ROW]] as [number, number][],
      ),
      interact: live ? h.id : undefined,
    });
    if (!live || !h.id) continue;
    interacts.push({
      id: h.id,
      kind: h.id === "home" ? "enter" : "modal",
      modal: h.id === "about" ? "__about" : h.id === "admin" ? "__admin" : undefined,
      label: h.label!,
      verb: h.verb!,
      signX: h.c * T,
      signY: (HOUSE_ROW + 1) * T,
      spotX: isCastle ? h.c * T : h.c * T + 8, // the castle door is dead centre; the houses' just right of it
      spotY: (HOUSE_ROW + 1) * T + 12,
    });
  }

  // the big sorry board, just left of where you arrive
  place("sorryBoard", 16.125, 14, {
    blockTiles: [11, 12, 13, 14, 15, 16, 17, 18, 19].map((c) => [c, 14] as [number, number]),
  });
  // and a second board of kind reminders beside it
  place("kindBoard", 7.125, 14, {
    blockTiles: [3, 4, 5, 6, 7, 8, 9, 10].map((c) => [c, 14] as [number, number]),
  });
  reserve(3, 9, 19, 14);

  // Sheza and the superadmin can change the words on the boards
  if (canEdit) {
    for (const [id, x, label] of [
      ["sorry", 16.125 * T, "Edit the sorry board"],
      ["kind", 7.125 * T, "Edit the reminders board"],
    ] as const) {
      interacts.push({
        id: `board:${id}`,
        kind: "act",
        act: `board:${id}`,
        label: "Board",
        verb: label,
        signX: x,
        signY: 15 * T + 2,
        spotX: x,
        spotY: 15 * T + 14,
        hitDy: 22,
        hitR: 26,
      });
    }
  }

  // square: campfire with benches, jukebox, lamps and flowers
  place("campfire", 22, 10, { blockTiles: [[21, 10], [22, 10]] });
  place("bench", 25.5, 10, { blockTiles: [[25, 10], [26, 10]] });
  const boxC = 29;
  place("jukebox", boxC + 0.5, 11, { blockTiles: [[boxC, 11]], interact: "song" });
  interacts.push({
    id: "song",
    kind: "modal",
    modal: "__song",
    label: "Jukebox",
    verb: "Listen to the jukebox",
    signX: (boxC + 0.5) * T,
    signY: 12 * T,
    spotX: (boxC + 0.5) * T - 10,
    spotY: 12 * T + 12,
  });
  for (const lc of [7, 13, 19, 25, 31, 37]) place("lamp", lc + 0.5, 8, { blockTiles: [[lc, 8]] });
  // dressing the street: flower troughs under the house windows, barrels and
  // crates at the ends, golden topiary round the palace door, a welcome rug,
  // a market stall and a well
  for (const hc of [10, 16, 28, 34]) {
    place("planter", hc - 1.5, 7.5);
    place("planter", hc + 1.9, 7.5);
  }
  place("barrel", 11.9, 8, { blockTiles: [[11, 8]] });
  place("crate", 9.2, 8, { blockTiles: [[9, 8]] });
  place("barrel", 35.6, 8, { blockTiles: [[35, 8]] });
  place("crate", 36.2, 9, { blockTiles: [[36, 9]] });
  place("topiary", 20.4, 8, { blockTiles: [[20, 8]] });
  place("topiary", 23.6, 8, { blockTiles: [[23, 8]] });
  place("f_welcome", 22, 8.5, { flat: true });
  place("stall", 33, 11, { blockTiles: [[32, 11], [33, 11]] });
  place("well", 36.5, 11, { blockTiles: [[36, 11]] });
  reserve(30, 8, 39, 13);
  for (const [fx, fy] of [[15, 12], [16, 13], [27, 13], [30, 9], [12, 11], [33, 11], [9, 11], [14, 11]])
    place(`flower${(fx + fy) % 4}`, fx + 0.5, fy);

  // ---- posts ----
  stops.forEach((s, i) => {
    const row = R0 + i * GAP;
    const side = i % 2 === 0 ? -1 : 1;
    const sc = Math.round(pathCenter(row) + side * 3.2);
    const id = `post:${s.slug}`;
    place("sign0", sc + 0.5, row, { blockTiles: [[sc, row]], interact: id });
    reserve(sc - 2, row - 2, sc + 2, row + 1);
    const cxp = pathCenter(row);
    interacts.push({
      id,
      kind: "post",
      label: s.isNew ? `✨ ${s.title}` : s.title,
      verb: `Read “${s.title}”`,
      slug: s.slug,
      signX: (sc + 0.5) * T,
      signY: (row + 1) * T,
      spotX: cxp * T,
      spotY: (row + 1) * T,
    });

    // ---- free space after each post ----
    const fr = row + 6;
    const fside = -side;
    const fc = Math.round(pathCenter(fr) + fside * 9);
    const k = i % 5;
    if (k === 0) {
      // pond
      for (let r = fr - 3; r <= fr + 3; r++)
        for (let c = fc - 5; c <= fc + 5; c++) {
          const dx = (c - fc) / 3.6;
          const dy = (r - fr) / 2.6;
          if (dx * dx + dy * dy <= 1 && inB(c, r)) {
            kind[at(c, r)] = 2;
            block(c, r);
          }
        }
      reserve(fc - 6, fr - 4, fc + 6, fr + 4);
      // a fishing spot on the bank nearest the trail
      const bank = pathCenter(fr) >= fc ? 1 : -1;
      interacts.push({
        id: `fish:${i}`,
        kind: "act",
        act: "fish",
        label: "Pond",
        verb: "Go fishing",
        signX: (fc + bank * 4) * T + 8,
        signY: fr * T + 14,
        spotX: (fc + bank * 5) * T + 8,
        spotY: fr * T + 8,
        hitDy: 12,
        hitR: 24,
      });
    } else if (k === 1) {
      // campfire with benches
      place("campfire", fc + 0.5, fr, { blockTiles: [[fc, fr]] });
      place("bench", fc - 2, fr, { blockTiles: [[fc - 3, fr], [fc - 2, fr]] });
      place("bench", fc + 3, fr, { blockTiles: [[fc + 3, fr], [fc + 4, fr]] });
      reserve(fc - 5, fr - 3, fc + 6, fr + 3);
    } else if (k === 2) {
      // flower garden
      for (let r = fr - 2; r <= fr + 2; r++)
        for (let c = fc - 3; c <= fc + 3; c++)
          if (rand() < 0.75)
            place(`flower${Math.floor(rand() * 4)}`, c + 0.3 + rand() * 0.4, r, {
              flat: false,
            });
      place("bush", fc - 4 + 0.5, fr - 1, { blockTiles: [[fc - 4, fr - 1]] });
      place("bush", fc + 4 + 0.5, fr + 1, { blockTiles: [[fc + 4, fr + 1]] });
      place("lamp", fc + fside * -4.5 + 0.5, fr, { blockTiles: [[fc + Math.round(fside * -4.5), fr]] });
      reserve(fc - 5, fr - 3, fc + 5, fr + 3);
    } else if (k === 3) {
      // fenced plot, open on the path side
      const openSide = -fside; // faces the trail
      for (let c = fc - 3; c <= fc + 3; c++) {
        place("fence", c + 0.5, fr - 2, { blockTiles: [[c, fr - 2]] });
        place("fence", c + 0.5, fr + 2, { blockTiles: [[c, fr + 2]] });
      }
      for (let r = fr - 1; r <= fr + 1; r++) {
        const farC = openSide === 1 ? fc - 3 : fc + 3;
        place("fencePost", farC + 0.5, r, { blockTiles: [[farC, r]] });
        if (r !== fr) {
          const nearC = openSide === 1 ? fc + 3 : fc - 3;
          place("fencePost", nearC + 0.5, r, { blockTiles: [[nearC, r]] });
        }
      }
      for (let r = fr - 1; r <= fr + 1; r++)
        for (let c = fc - 2; c <= fc + 2; c++)
          if (rand() < 0.6)
            place(`flower${Math.floor(rand() * 4)}`, c + 0.5, r);
      reserve(fc - 4, fr - 3, fc + 4, fr + 3);
    } else {
      // picnic
      place("picnic", fc + 0.5, fr, { flat: true });
      place("basket", fc + 1.2, fr, { flat: true });
      place("bench", fc + 0.5, fr - 2, { blockTiles: [[fc, fr - 2], [fc + 1, fr - 2]] });
      place("rock", fc + 3.5, fr + 1, { blockTiles: [[fc + 3, fr + 1]] });
      reserve(fc - 3, fr - 4, fc + 4, fr + 3);
    }
  });

  // ---- end of the trail: mailbox (Subscribe) ----
  const er = endRow;
  const ec = pathCenter(er);
  const mc = Math.round(ec + 3.4);
  place("mailbox", mc + 0.5, er, { blockTiles: [[mc, er]], interact: "subscribe" });
  reserve(mc - 5, er - 2, mc + 2, er + 2);
  interacts.push({
    id: "subscribe",
    kind: "modal",
    modal: "__subscribe",
    label: "Mailbox",
    verb: "Open the mailbox to subscribe",
    signX: (mc + 0.5) * T,
    signY: (er + 1) * T,
    spotX: ec * T + 24,
    spotY: (er + 1) * T,
  });

  // ---- scenery ----
  const pickTree = () => {
    const v = rand();
    return v < 0.16
      ? "tree0"
      : v < 0.3
        ? "tree1"
        : v < 0.42
          ? "tree2"
          : v < 0.52
            ? "tree3"
            : v < 0.74
              ? "pine"
              : v < 0.9
                ? "pine2"
                : "treeBig";
  };
  for (let r = 0; r < rows; r += 2) {
    for (let c = 0; c < COLS; c += 2) {
      const tc = c + Math.floor(rand() * 2);
      const tr = r + Math.floor(rand() * 2);
      if (!inB(tc, tr) || reserved[at(tc, tr)] || kind[at(tc, tr)] !== 0) continue;
      const d = Math.abs(tc + 0.5 - pathCenter(tr));
      const edge = Math.min(tc, COLS - 1 - tc, tr, rows - 1 - tr);
      const p = edge < 4 ? 0.95 : d < 5.5 ? 0 : edge < 9 ? 0.34 : 0.14;
      if (rand() >= p) continue;
      place(pickTree(), tc + 0.5, tr, { blockTiles: [[tc, tr]] });
      blocked[at(tc, tr)] = 1;
    }
  }
  for (let r = 3; r < rows - 3; r++) {
    for (let c = 3; c < COLS - 3; c++) {
      if (reserved[at(c, r)] || blocked[at(c, r)] || kind[at(c, r)] !== 0) continue;
      const d = Math.abs(c + 0.5 - pathCenter(r));
      if (d < 2.8) continue;
      const v = rand();
      if (v < 0.05) {
        place(`flower${Math.floor(rand() * 4)}`, c + 0.3 + rand() * 0.4, r);
      } else if (v < 0.065 && d > 3.6) {
        place(rand() < 0.5 ? "bush" : "bush2", c + 0.5, r, { blockTiles: [[c, r]] });
      } else if (v < 0.073 && d > 3.6) {
        place(rand() < 0.5 ? "rock" : "rock2", c + 0.5, r, { blockTiles: [[c, r]] });
      } else if (v < 0.08 && d > 3.6) {
        place(`mush${1 + Math.floor(rand() * 3)}`, c + 0.5, r);
      } else if (v < 0.085 && d > 3.6) {
        place(rand() < 0.6 ? "stump" : "stumpBig", c + 0.5, r, { blockTiles: [[c, r]] });
      } else if (v < 0.088 && d > 3.6) {
        place("log", c + 0.5, r, { blockTiles: [[c, r]] });
      }
    }
  }

  objects.sort((a, b) => a.y - b.y);

  return {
    cols: COLS,
    rows,
    w: COLS * T,
    h: rows * T,
    kind,
    blocked,
    objects,
    interacts,
    start: { x: (COLS / 2) * T, y: 12 * T + 8 },
  };
}

export function tileBlocked(world: World, px: number, py: number) {
  const c = Math.floor(px / T);
  const r = Math.floor(py / T);
  if (c < 0 || r < 0 || c >= world.cols || r >= world.rows) return true;
  return world.blocked[r * world.cols + c] === 1;
}

// ---- auto-walk: a tile path around obstacles, then straightened ----
export function footFree(world: World, x: number, y: number) {
  return !(
    tileBlocked(world, x - 4, y) ||
    tileBlocked(world, x + 4, y) ||
    tileBlocked(world, x - 4, y - 3) ||
    tileBlocked(world, x + 4, y - 3)
  );
}

function segmentFree(world: World, x0: number, y0: number, x1: number, y1: number) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    if (!footFree(world, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f)) return false;
  }
  return true;
}

export function planRoute(
  world: World,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): { x: number; y: number }[] | null {
  const { cols, rows } = world;
  const free = (c: number, r: number) =>
    c >= 0 && r >= 0 && c < cols && r < rows && world.blocked[r * cols + c] === 0;
  const sc = Math.floor(sx / T);
  const sr = Math.floor(sy / T);
  const tc = Math.floor(tx / T);
  const tr = Math.floor(ty / T);
  if (!free(tc, tr)) return null;
  if (segmentFree(world, sx, sy, tx, ty)) return [{ x: tx, y: ty }];

  const prev = new Int32Array(cols * rows).fill(-2);
  const start = sr * cols + sc;
  const goal = tr * cols + tc;
  prev[start] = -1;
  const queue = [start];
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  for (let qi = 0; qi < queue.length && prev[goal] === -2; qi++) {
    const cur = queue[qi];
    const c = cur % cols;
    const r = Math.floor(cur / cols);
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (!free(nc, nr) || prev[nr * cols + nc] !== -2) continue;
      if (dc !== 0 && dr !== 0 && (!free(c + dc, r) || !free(c, r + dr))) continue;
      prev[nr * cols + nc] = cur;
      queue.push(nr * cols + nc);
    }
  }
  if (prev[goal] === -2) return null;

  const tiles: { x: number; y: number }[] = [];
  for (let n = goal; n !== -1; n = prev[n]) {
    tiles.push({ x: (n % cols) * T + T / 2, y: Math.floor(n / cols) * T + T / 2 + 4 });
  }
  tiles.reverse();
  tiles[tiles.length - 1] = { x: tx, y: ty };

  // string-pull: skip any waypoint we can already see past
  const out: { x: number; y: number }[] = [];
  let ax = sx;
  let ay = sy;
  let i = 0;
  while (i < tiles.length) {
    let j = tiles.length - 1;
    while (j > i && !segmentFree(world, ax, ay, tiles[j].x, tiles[j].y)) j--;
    out.push(tiles[j]);
    ax = tiles[j].x;
    ay = tiles[j].y;
    i = j + 1;
  }
  return out;
}
