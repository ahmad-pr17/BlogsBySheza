// A day/night cycle shared by everyone: it follows the wall clock, so all
// visitors see the same time of day. Sleeping in the Home skips your own view
// ahead (a personal shift), the way it used to flip day and night.

// Switched off for now: it is always daytime. Set to true to bring the
// day/night cycle back (dimming, glowing lamps, night windows in the Home).
export const DAY_NIGHT_ENABLED = false;

export const CYCLE = 480; // seconds for one full day (8 minutes)

// [phase, darkness]: phase 0 is the end of the night, 0.14 full day.
const KEYS: [number, number][] = [
  [0, 0.9],
  [0.07, 0.4],
  [0.14, 0],
  [0.52, 0],
  [0.62, 0.45],
  [0.72, 1],
  [1, 0.9],
];

export function phaseAt(shift: number) {
  const t = Date.now() / 1000 + shift;
  return (((t % CYCLE) + CYCLE) % CYCLE) / CYCLE;
}

// 0 = bright day, 1 = deep night
export function darknessAt(shift: number) {
  if (!DAY_NIGHT_ENABLED) return 0;
  const p = phaseAt(shift);
  for (let i = 1; i < KEYS.length; i++) {
    const [p1, d1] = KEYS[i];
    if (p <= p1) {
      const [p0, d0] = KEYS[i - 1];
      const f = (p - p0) / (p1 - p0);
      const s = f * f * (3 - 2 * f); // smoothstep
      return d0 + (d1 - d0) * s;
    }
  }
  return KEYS[KEYS.length - 1][1];
}

export function labelAt(shift: number) {
  if (!DAY_NIGHT_ENABLED) return "☀️ Day";
  const d = darknessAt(shift);
  const p = phaseAt(shift);
  if (d > 0.6) return "🌙 Night";
  if (d > 0.12) return p < 0.3 ? "🌅 Dawn" : "🌇 Dusk";
  return "☀️ Day";
}

// How many seconds to skip so the viewer wakes up in the morning (if it is
// night) or goes to bed in the evening (if it is day).
export function skipSeconds(shift: number) {
  const p = phaseAt(shift);
  const target = darknessAt(shift) > 0.5 ? 0.16 : 0.74;
  return (((target - p) % 1) + 1) % 1 * CYCLE;
}
