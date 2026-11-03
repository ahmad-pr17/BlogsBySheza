"use client";

// The recipe book: more dishes open up as you cook (meals cooked so far).
export const RECIPES: { key: string; name: string; icon: string; secs: number; need: number }[] = [
  { key: "dishBread", name: "honey bread", icon: "🍞", secs: 2.5, need: 0 },
  { key: "dishSoup", name: "garden soup", icon: "🥣", secs: 3, need: 0 },
  { key: "dishPie", name: "berry pie", icon: "🥧", secs: 3.8, need: 2 },
  { key: "dishStew", name: "mushroom stew", icon: "🍲", secs: 4.2, need: 4 },
];

export function RecipeBook({
  cooked,
  nextUnlock,
  onChoose,
  onClose,
}: {
  cooked: number; // meals cooked so far
  nextUnlock: number | undefined; // the meal count of the next home upgrade
  onChoose: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="g-recipes" role="dialog" aria-modal="true" aria-label="Recipe book">
      <div className="g-recipes-card">
        <p className="g-pick-title">📖 Recipe book</p>
        <ul>
          {RECIPES.map((r, i) => {
            const locked = cooked < r.need;
            return (
              <li key={r.key}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onChoose(i)}
                  autoFocus={i === 0}
                >
                  <span className="g-rec-icon">{locked ? "🔒" : r.icon}</span>
                  <span className="g-rec-name">
                    {locked ? "???" : r.name}
                    <small>
                      {locked ? `Cook ${r.need - cooked} more to unlock` : `${r.secs} seconds`}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="g-recipes-note">
          Meals cooked: {cooked}
          {nextUnlock ? ` · something new at ${nextUnlock}` : " · your home is fully decorated!"}
        </p>
        <button type="button" className="g-gate-btn" onClick={onClose}>
          Never mind
        </button>
      </div>
    </div>
  );
}
