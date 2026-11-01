"use client";

import { useEffect, useRef, useState } from "react";

// A fox (left) and a bear (right) read along with the post. Every so often
// each one looks up at the reader, then turns back to the blog. Drawn in code
// in the Sprout Lands palette since the pack has no such animals.

type Animal = "fox" | "bear";
type Pose = "read" | "look" | "blink";
type Ctx = CanvasRenderingContext2D;

const W = 48;
const H = 58;

const OUT = "#3a2417";
const EYE = "#24160e";
const WHITE = "#fffbea";
const PAPER = "#f3e5c2";
const PAPER_D = "#d9c398";
const COVER = "#4a588e";
const COVER_L = "#7180b1";

type Pal = {
  body: string;
  shade: string;
  light: string;
  cream: string;
  creamShade: string;
  dark: string;
  inner: string;
};
const PAL: Record<Animal, Pal> = {
  fox: {
    body: "#e5793a",
    shade: "#c25a24",
    light: "#f39a55",
    cream: "#fff1c9",
    creamShade: "#ecd4a0",
    dark: "#5a2f1c",
    inner: "#8c3f26",
  },
  bear: {
    body: "#a9794f",
    shade: "#855a39",
    light: "#c39468",
    cream: "#e2bf93",
    creamShade: "#c9a074",
    dark: "#5b3a24",
    inner: "#d8a47c",
  },
};

const px = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

// Filled ellipse with a 1px outline, a shaded lower-right and a lit upper-left.
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
      px(c, shade && d > 0.38 ? shade : light && d < -0.6 ? light : fill, x, y);
    }
}

// Pointed ear: outline triangle with a lighter filled inside.
function tri(
  c: Ctx,
  cx: number,
  baseY: number,
  half: number,
  h: number,
  fill: string,
  inner: string,
) {
  for (let r = 0; r < h; r++) {
    const w = Math.round((half * (r + 1)) / h);
    px(c, OUT, cx - w, baseY - h + r, w * 2 + 1);
  }
  for (let r = 1; r < h; r++) {
    const w = Math.round((half * (r + 1)) / h) - 1;
    if (w >= 0) px(c, fill, cx - w, baseY - h + r, w * 2 + 1);
  }
  const ih = Math.max(2, Math.round(h * 0.5));
  for (let r = 0; r < ih; r++) {
    const w = Math.round(((half - 2) * (r + 1)) / ih);
    if (w >= 0) px(c, inner, cx - w, baseY - ih + r - 1, w * 2 + 1);
  }
}

function draw(c: Ctx, animal: Animal, pose: Pose, tick: number) {
  const p = PAL[animal];
  c.clearRect(0, 0, W, H);

  // The blog is toward the middle of the screen: fox looks right, bear left.
  const toward = animal === "fox" ? 1 : -1;
  const turned = pose !== "look";
  const hx = turned ? toward * 3 : 0;
  const hy = turned ? 2 : 0;
  const hcx = 24 + hx;
  const hcy = 20 + hy;

  // shadow
  blob(c, 24, 55, 17, 2.5, "rgba(53,55,56,0.28)", undefined, undefined, null);

  // tail (fox: big and bushy, wags; bear: a little stub)
  if (animal === "fox") {
    const side = -toward; // behind the body, away from the page
    const wag = tick % 2;
    const tx = 24 + side * 15 + side * wag;
    blob(c, tx, 42, 6.5, 11, p.body, p.shade, p.light);
    // cream tip
    for (let y = 30; y <= 37; y++)
      for (let x = tx - 7; x <= tx + 7; x++) {
        const dx = (x + 0.5 - tx) / 6.5;
        const dy = (y + 0.5 - 42) / 11;
        if (dx * dx + dy * dy <= 0.8 && y < 36) px(c, p.cream, x, y);
      }
  } else {
    blob(c, 24 - toward * 13, 48, 3.5, 3.5, p.body, p.shade, p.light);
  }

  // body
  blob(c, 24, 43, 12, 13, p.body, p.shade, p.light);
  blob(c, 24, 46, 7, 9, p.cream, p.creamShade, undefined, null);

  // feet
  blob(c, 17, 54, 5, 2.4, p.dark);
  blob(c, 31, 54, 5, 2.4, p.dark);

  // ears
  if (animal === "fox") {
    tri(c, hcx - 10, hcy - 7, 5, 10, p.body, p.inner);
    tri(c, hcx + 10, hcy - 7, 5, 10, p.body, p.inner);
  } else {
    blob(c, hcx - 11, hcy - 8, 5, 5, p.body, p.shade, p.light);
    blob(c, hcx + 11, hcy - 8, 5, 5, p.body, p.shade, p.light);
    blob(c, hcx - 11, hcy - 8, 2.4, 2.4, p.inner, undefined, undefined, null);
    blob(c, hcx + 11, hcy - 8, 2.4, 2.4, p.inner, undefined, undefined, null);
  }

  // head
  blob(c, hcx, hcy, 15, 12, p.body, p.shade, p.light);
  if (animal === "fox") {
    // white cheeks sweeping into a pointed muzzle
    blob(c, hcx - 8, hcy + 5, 7, 5, p.cream, p.creamShade, undefined, null);
    blob(c, hcx + 8, hcy + 5, 7, 5, p.cream, p.creamShade, undefined, null);
    blob(c, hcx, hcy + 7, 6, 5, p.cream, p.creamShade, undefined, null);
    // dark brow marks
    px(c, p.shade, hcx - 8, hcy - 5, 4, 1);
    px(c, p.shade, hcx + 5, hcy - 5, 4, 1);
  } else {
    // round muzzle
    blob(c, hcx, hcy + 5, 7, 5.5, p.cream, p.creamShade, p.cream);
  }

  // eyes: look = straight at you; read = glance toward and down at the page
  const ex1 = hcx - 7;
  const ex2 = hcx + 4;
  const ey = hcy - 2;
  if (pose === "blink") {
    px(c, EYE, ex1, ey + 2, 4);
    px(c, EYE, ex2, ey + 2, 4);
  } else {
    const gx = pose === "look" ? 0 : toward;
    const gy = pose === "look" ? 0 : 1;
    for (const ex of [ex1, ex2]) {
      px(c, WHITE, ex, ey, 4, 5);
      px(c, EYE, ex + 1 + gx, ey + 1 + gy, 2, 3);
      px(c, WHITE, ex + 1 + gx + (gx > 0 ? 1 : 0), ey + 1 + gy, 1, 1);
    }
  }

  // nose and mouth
  const nx = hcx - 2;
  const ny = hcy + (animal === "fox" ? 5 : 4);
  px(c, EYE, nx, ny, 4, 3);
  px(c, EYE, nx + 1, ny + 3, 2, 1);
  px(c, "#ffffff", nx + 1, ny, 1, 1);
  px(c, EYE, nx - 1, ny + 4, 1, 1);
  px(c, EYE, nx + 4, ny + 4, 1, 1);
  px(c, EYE, nx, ny + 5, 4, 1);
  if (animal === "bear") {
    px(c, "#d98f8a", nx + 1, ny + 6, 2, 1);
  }

  // open book held up in front
  c.save();
  const bx = 11;
  const by = 36;
  px(c, OUT, bx, by, 26, 14);
  px(c, COVER, bx + 1, by + 1, 24, 12);
  px(c, COVER_L, bx + 1, by + 1, 24, 1);
  px(c, PAPER, bx + 2, by + 1, 10, 11);
  px(c, PAPER, bx + 13, by + 1, 10, 11);
  px(c, PAPER_D, bx + 11, by + 1, 2, 11);
  px(c, OUT, bx + 12, by + 1, 1, 11);
  for (let i = 0; i < 4; i++) {
    px(c, PAPER_D, bx + 3, by + 3 + i * 2, 7);
    px(c, PAPER_D, bx + 14, by + 3 + i * 2, 7 - (i % 2) * 2);
  }
  c.restore();

  // paws gripping the book edges
  blob(c, bx + 1, by + 8, 3.2, 3.8, p.body, p.shade, p.light);
  blob(c, bx + 24, by + 8, 3.2, 3.8, p.body, p.shade, p.light);
}

function Reader({ animal, delay }: { animal: Animal; delay: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pose, setPose] = useState<Pose>("read");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (c) draw(c, animal, pose, tick);
  }, [animal, pose, tick]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const step = (next: Pose) => {
      if (!alive) return;
      setPose(next);
      // reading is long, looking up and blinking are short
      const wait =
        next === "read"
          ? 2200 + Math.random() * 2200
          : next === "look"
            ? 1100 + Math.random() * 700
            : 140;
      timer = setTimeout(() => {
        if (next === "read") step(Math.random() < 0.25 ? "blink" : "look");
        else step("read");
      }, wait);
    };
    timer = setTimeout(() => step("look"), delay);
    const wag = setInterval(() => setTick((t) => t + 1), 650);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(wag);
    };
  }, [delay]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className={`reader reader-${animal}`}
      aria-hidden="true"
    />
  );
}

export function Readers() {
  return (
    <div className="readers" aria-hidden="true">
      <Reader animal="fox" delay={900} />
      <Reader animal="bear" delay={2300} />
    </div>
  );
}
