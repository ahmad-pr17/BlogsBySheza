// A day/night cycle shared by everyone: it follows the wall clock, so all
// visitors see the same time of day. Sleeping skips your own view ahead, and
// the clock button in the corner jumps to the next part of the day.
//
// The look of each part of the day is a colour grade (a multiply tint plus a
// soft overlay) that the game applies on top of the finished picture, and a
// "darkness" number that decides how much the lamps, windows and fairy lights
// shine.

export const DAY_NIGHT_ENABLED = true;

export const CYCLE = 480; // seconds for one full day (8 minutes)

export type Period = "morning" | "noon" | "sunset" | "night";
type RGB = [number, number, number];
type RGBA = [number, number, number, number];

export type Light = {
  period: Period;
  label: string;
  mult: RGB; // multiplied over the picture (255,255,255 = no change)
  add: RGBA; // a soft colour wash (the glow of the sky)
  dark: number; // 0 = full light, 1 = deep night
  p: number; // phase of the day, 0..1
};

export const PERIOD_LABEL: Record<Period, string> = {
  morning: "🌅 Morning",
  noon: "☀️ Noon",
  sunset: "🌇 Sunset",
  night: "🌙 Night",
};

// The middle of each part of the day (used when jumping or sleeping).
const MID: Record<Period, number> = { morning: 0.25, noon: 0.5, sunset: 0.71, night: 0.92 };
const ORDER: Period[] = ["morning", "noon", "sunset", "night"];

type Key = { p: number; mult: RGB; add: RGBA; dark: number };
const KEYS: Key[] = [
  { p: 0.0, mult: [78, 92, 255], add: [20, 40, 190, 0.1], dark: 1 }, // deep night: rich royal blue
  { p: 0.1, mult: [140, 122, 255], add: [150, 80, 190, 0.1], dark: 0.8 }, // first light
  { p: 0.17, mult: [255, 190, 190], add: [255, 140, 120, 0.13], dark: 0.35 }, // sunrise
  { p: 0.25, mult: [255, 234, 212], add: [255, 205, 150, 0.06], dark: 0.05 }, // morning
  { p: 0.38, mult: [255, 251, 242], add: [255, 255, 255, 0], dark: 0 },
  { p: 0.5, mult: [255, 255, 255], add: [255, 255, 255, 0], dark: 0 }, // noon
  { p: 0.6, mult: [255, 247, 228], add: [255, 232, 172, 0.03], dark: 0 }, // afternoon
  { p: 0.7, mult: [255, 208, 150], add: [255, 150, 70, 0.09], dark: 0.3 }, // sunset: golden amber
  { p: 0.78, mult: [178, 140, 236], add: [120, 80, 200, 0.1], dark: 0.65 }, // dusk: violet
  { p: 0.86, mult: [108, 100, 255], add: [40, 50, 200, 0.1], dark: 0.95 },
  { p: 1.0, mult: [78, 92, 255], add: [20, 40, 190, 0.1], dark: 1 },
];

export function phaseAt(shift: number) {
  const t = Date.now() / 1000 + shift;
  return (((t % CYCLE) + CYCLE) % CYCLE) / CYCLE;
}

export function periodOf(p: number): Period {
  if (p >= 0.12 && p < 0.4) return "morning";
  if (p >= 0.4 && p < 0.64) return "noon";
  if (p >= 0.64 && p < 0.8) return "sunset";
  return "night";
}

const mix = (a: number[], b: number[], f: number) => a.map((v, i) => v + (b[i] - v) * f);

export function lightAtPhase(p: number): Light {
  let i = 1;
  while (i < KEYS.length - 1 && p > KEYS[i].p) i++;
  const k0 = KEYS[i - 1];
  const k1 = KEYS[i];
  const f0 = (p - k0.p) / (k1.p - k0.p);
  const f = f0 * f0 * (3 - 2 * f0); // smoothstep
  const period = periodOf(p);
  return {
    period,
    label: PERIOD_LABEL[period],
    mult: mix(k0.mult, k1.mult, f) as RGB,
    add: mix(k0.add, k1.add, f) as RGBA,
    dark: k0.dark + (k1.dark - k0.dark) * f,
    p,
  };
}

export function lightAt(shift: number): Light {
  return lightAtPhase(phaseAt(shift));
}

// 0 = bright day, 1 = deep night
export function darknessAt(shift: number) {
  return lightAt(shift).dark;
}

export function labelAt(shift: number) {
  return lightAt(shift).label;
}

const secondsTo = (shift: number, target: number) =>
  ((((target - phaseAt(shift)) % 1) + 1) % 1) * CYCLE;

// Seconds to skip to land in the middle of the next part of the day.
export function nextPeriodSeconds(shift: number) {
  const cur = periodOf(phaseAt(shift));
  return secondsTo(shift, MID[ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]]);
}

// Sleeping: from the night you wake up in the morning; from the day you
// sleep until sunset (and from sunset until the morning).
export function skipSeconds(shift: number) {
  const cur = periodOf(phaseAt(shift));
  const target = cur === "morning" || cur === "noon" ? MID.sunset : MID.morning;
  return secondsTo(shift, target);
}
