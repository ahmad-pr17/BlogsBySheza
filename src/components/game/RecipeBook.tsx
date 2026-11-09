"use client";

// The recipe book: more dishes open up as you cook (meals cooked so far).
export type Step =
  | { kind: "add"; text: string; items: { icon: string; name: string; right: boolean }[] }
  | { kind: "tap"; text: string; icon: string; taps: number; verb: string }
  | { kind: "heat"; text: string; icon: string; zone: number; speed: number };

export type Recipe = {
  key: string;
  name: string;
  icon: string;
  need: number;
  blurb: string;
  steps: Step[];
};

const ok = (icon: string, name: string) => ({ icon, name, right: true });
const no = (icon: string, name: string) => ({ icon, name, right: false });

export const RECIPES: Recipe[] = [
  {
    key: "dishBread",
    name: "honey bread",
    icon: "🍞",
    need: 0,
    blurb: "Soft, golden and sweet.",
    steps: [
      {
        kind: "add",
        text: "Add the dough ingredients to the bowl.",
        items: [ok("🌾", "flour"), no("🌶️", "chili"), ok("🍯", "honey"), ok("🥛", "milk"), ok("🧂", "salt")],
      },
      { kind: "tap", text: "Knead the dough!", icon: "👐", taps: 12, verb: "Knead" },
      { kind: "tap", text: "Shape it into a loaf.", icon: "🍞", taps: 6, verb: "Shape" },
      { kind: "heat", text: "Bake until golden.", icon: "🔥", zone: 0.24, speed: 0.55 },
    ],
  },
  {
    key: "dishCookies",
    name: "chocolate chip cookies",
    icon: "🍪",
    need: 0,
    blurb: "Crispy edges, gooey middle.",
    steps: [
      {
        kind: "add",
        text: "Cream the butter, then add the good stuff.",
        items: [ok("🧈", "butter"), ok("🍬", "sugar"), no("🧅", "onion"), ok("🌾", "flour"), ok("🍫", "choc chips")],
      },
      { kind: "tap", text: "Mix the dough.", icon: "🥄", taps: 10, verb: "Mix" },
      { kind: "tap", text: "Roll little dough balls.", icon: "🍪", taps: 8, verb: "Roll" },
      { kind: "heat", text: "Bake until just golden.", icon: "🔥", zone: 0.22, speed: 0.6 },
    ],
  },
  {
    key: "dishCupcake",
    name: "vanilla cupcakes",
    icon: "🧁",
    need: 0,
    blurb: "Fluffy, with sprinkles on top.",
    steps: [
      {
        kind: "add",
        text: "Cream the butter and sugar.",
        items: [ok("🧈", "butter"), ok("🍬", "sugar"), no("🧄", "garlic")],
      },
      {
        kind: "add",
        text: "Add the eggs and flour.",
        items: [ok("🥚", "eggs"), ok("🌾", "flour"), no("🧅", "onion"), ok("🌼", "vanilla")],
      },
      { kind: "tap", text: "Stir the batter.", icon: "🥄", taps: 10, verb: "Stir" },
      { kind: "heat", text: "Bake the cupcakes.", icon: "🔥", zone: 0.22, speed: 0.6 },
      { kind: "tap", text: "Frost and sprinkle!", icon: "🧁", taps: 8, verb: "Frost" },
    ],
  },
  {
    key: "dishSoup",
    name: "garden soup",
    icon: "🥣",
    need: 1,
    blurb: "Fresh veggies in a warm broth.",
    steps: [
      { kind: "tap", text: "Chop the vegetables.", icon: "🔪", taps: 10, verb: "Chop" },
      {
        kind: "add",
        text: "Into the pot they go.",
        items: [ok("🥕", "carrot"), ok("🥔", "potato"), no("🍫", "chocolate"), ok("🧅", "onion"), ok("💧", "broth")],
      },
      { kind: "heat", text: "Simmer gently.", icon: "♨️", zone: 0.26, speed: 0.55 },
      {
        kind: "add",
        text: "Season it.",
        items: [ok("🧂", "salt"), ok("🌿", "herbs"), no("🍓", "strawberry")],
      },
    ],
  },
  {
    key: "dishTart",
    name: "pineapple tarts",
    icon: "🍍",
    need: 2,
    blurb: "Buttery little jam-filled bites.",
    steps: [
      {
        kind: "add",
        text: "Gather the dough ingredients.",
        items: [ok("🧈", "butter"), ok("🌾", "flour"), ok("🥚", "egg yolk"), no("🌶️", "chili"), ok("🍬", "sugar")],
      },
      { kind: "tap", text: "Knead the dough.", icon: "👐", taps: 10, verb: "Knead" },
      { kind: "tap", text: "Roll it out and cut rounds.", icon: "🥢", taps: 8, verb: "Cut" },
      { kind: "tap", text: "Fill each tart with pineapple jam.", icon: "🍍", taps: 8, verb: "Fill" },
      { kind: "heat", text: "Bake until golden.", icon: "🔥", zone: 0.2, speed: 0.65 },
    ],
  },
  {
    key: "dishRamen",
    name: "ramen",
    icon: "🍜",
    need: 3,
    blurb: "Slurp-worthy noodles in rich broth.",
    steps: [
      { kind: "heat", text: "Simmer the broth.", icon: "♨️", zone: 0.24, speed: 0.6 },
      {
        kind: "add",
        text: "Add the noodles.",
        items: [ok("🍜", "noodles"), no("🍚", "rice"), no("🍞", "bread")],
      },
      {
        kind: "add",
        text: "Toppings: egg, scallion, nori, pork!",
        items: [ok("🥚", "egg"), ok("🧅", "scallion"), ok("🌊", "nori"), ok("🥓", "pork"), no("🍫", "chocolate")],
      },
      { kind: "tap", text: "Arrange the bowl.", icon: "🥢", taps: 8, verb: "Arrange" },
    ],
  },
  {
    key: "dishPie",
    name: "berry pie",
    icon: "🥧",
    need: 4,
    blurb: "Flaky crust, juicy berries.",
    steps: [
      {
        kind: "add",
        text: "Make the crust dough.",
        items: [ok("🌾", "flour"), ok("🧈", "butter"), ok("🧊", "cold water"), no("🧅", "onion")],
      },
      { kind: "tap", text: "Roll out the crust.", icon: "🥢", taps: 8, verb: "Roll" },
      {
        kind: "add",
        text: "Fill it with berries.",
        items: [ok("🍓", "strawberry"), ok("🫐", "blueberry"), ok("🍬", "sugar"), no("🌶️", "chili"), no("🥒", "cucumber")],
      },
      { kind: "tap", text: "Weave the lattice top.", icon: "🥧", taps: 10, verb: "Weave" },
      { kind: "heat", text: "Bake until bubbly.", icon: "🔥", zone: 0.2, speed: 0.7 },
    ],
  },
  {
    key: "dishBiryani",
    name: "chicken biryani",
    icon: "🍛",
    need: 6,
    blurb: "Spiced, layered and steamed on dum.",
    steps: [
      {
        kind: "add",
        text: "Marinate the chicken with spices.",
        items: [ok("🍗", "chicken"), ok("🥛", "yogurt"), ok("🌶️", "chili"), ok("🧄", "garlic"), no("🍫", "chocolate"), ok("🫚", "ginger")],
      },
      { kind: "heat", text: "Fry the onions golden.", icon: "🧅", zone: 0.2, speed: 0.7 },
      { kind: "heat", text: "Par-boil the rice.", icon: "🍚", zone: 0.22, speed: 0.7 },
      { kind: "tap", text: "Layer the rice and chicken.", icon: "🍛", taps: 10, verb: "Layer" },
      { kind: "heat", text: "Seal and steam on dum.", icon: "♨️", zone: 0.18, speed: 0.75 },
      {
        kind: "add",
        text: "Drizzle the saffron milk.",
        items: [ok("🌼", "saffron"), ok("🥛", "milk"), no("🍋", "lemon juice")],
      },
    ],
  },
  {
    key: "dishStew",
    name: "mushroom stew",
    icon: "🍲",
    need: 8,
    blurb: "Earthy, hearty and cosy.",
    steps: [
      { kind: "tap", text: "Slice the mushrooms.", icon: "🔪", taps: 10, verb: "Slice" },
      { kind: "heat", text: "Sauté the onions.", icon: "🧅", zone: 0.2, speed: 0.7 },
      {
        kind: "add",
        text: "Add the good stuff.",
        items: [ok("🍄", "mushrooms"), ok("🥔", "potato"), ok("🥕", "carrot"), no("🍓", "strawberry"), ok("💧", "broth")],
      },
      { kind: "heat", text: "Simmer until tender.", icon: "♨️", zone: 0.2, speed: 0.75 },
      { kind: "tap", text: "Give it a good stir.", icon: "🥄", taps: 10, verb: "Stir" },
      {
        kind: "add",
        text: "Finish with herbs.",
        items: [ok("🌿", "herbs"), ok("🧂", "salt"), no("🍫", "chocolate")],
      },
    ],
  },
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
      <div
        className="g-recipes-card"
        style={{ maxHeight: "calc(100dvh - 32px)", overflowY: "auto" }}
      >
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
                      {locked
                        ? `Cook ${r.need - cooked} more to unlock`
                        : `${r.blurb} · ${r.steps.length} steps`}
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
