import type { CSSProperties } from "react";

// Deterministic PRNG (mulberry32) so server and client render identical
// fireflies — same approach as the Starfield.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeFireflies(count: number, seed: number, sizeBoost: number) {
  const rand = mulberry32(seed);
  // A small warm drift offset in px, so each firefly wanders a little.
  const drift = () => Math.round((rand() * 2 - 1) * 55);
  return Array.from({ length: count }, () => ({
    size: sizeBoost + 3 + Math.round(rand() * 3), // bigger than the 1–3px stars
    top: +(12 + rand() * 82).toFixed(2),
    left: +(rand() * 100).toFixed(2),
    // Three wander waypoints for a smooth, non-linear path.
    x1: drift(),
    y1: drift(),
    x2: drift(),
    y2: drift(),
    x3: drift(),
    y3: drift(),
    moveDur: +(9 + rand() * 8).toFixed(1), // 9–17s slow drift
    glowDur: +(2.2 + rand() * 3).toFixed(1), // 2.2–5.2s blink
    glowDelay: +(rand() * 5).toFixed(1),
  }));
}

type Props = {
  count?: number;
  seed?: number;
  // Added to each firefly's base size (foreground flies read a touch larger).
  sizeBoost?: number;
  className?: string;
};

export function Fireflies({
  count = 34,
  seed = 0x1eff1e5,
  sizeBoost = 0,
  className,
}: Props) {
  const flies = makeFireflies(count, seed, sizeBoost);
  return (
    <div aria-hidden="true" className={className}>
      {flies.map((f, i) => (
        <span
          key={i}
          className="firefly"
          style={
            {
              width: f.size,
              height: f.size,
              top: `${f.top}%`,
              left: `${f.left}%`,
              "--x1": `${f.x1}px`,
              "--y1": `${f.y1}px`,
              "--x2": `${f.x2}px`,
              "--y2": `${f.y2}px`,
              "--x3": `${f.x3}px`,
              "--y3": `${f.y3}px`,
              "--md": `${f.moveDur}s`,
              "--gd": `${f.glowDur}s`,
              "--gdelay": `${f.glowDelay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
