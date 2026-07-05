const STAR_COLORS = ["#ffffff", "#ffd36b", "#8fd0ff", "#c9a2ff", "#ff8f8f"];

// Deterministic PRNG (mulberry32) so the server and client render identical
// star fields — avoids hydration mismatches while keeping the layout "random".
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260706);

const STARS = Array.from({ length: 44 }, () => {
  const size = 1 + Math.round(rand() * 2);
  return {
    size,
    top: Math.round(rand() * 150),
    left: +(rand() * 100).toFixed(2),
    color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
    delay: +(rand() * 4).toFixed(2),
  };
});

export function Starfield() {
  return (
    <div aria-hidden="true">
      {STARS.map((star, i) => (
        <span
          key={i}
          className="star"
          style={{
            width: star.size,
            height: star.size,
            top: star.top,
            left: `${star.left}%`,
            background: star.color,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
