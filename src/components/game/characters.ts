// Who you can play as. The superadmin is always the fox; visitors pick one of
// the others on the entry screen.

export type CharKind = "farmer" | "fox" | "bear" | "bunny" | "frog" | "chicken";

export const VISITOR_CHARS: { kind: CharKind; label: string }[] = [
  { kind: "farmer", label: "Farmer" },
  { kind: "bear", label: "Bear" },
  { kind: "bunny", label: "Bunny" },
  { kind: "frog", label: "Frog" },
  { kind: "chicken", label: "Chicken" },];

export const FARMER_TINTS = 2; // shirt colours: yellow, sky blue (see TINT_HUES in art.ts, .g-tint in globals.css)

export type Choice = { kind: CharKind; tint: number };

export const DEFAULT_CHOICE: Choice = { kind: "farmer", tint: 1 };
export const FOX_CHOICE: Choice = { kind: "fox", tint: 0 };
// Sheza (the owner): the farmer in a pink shirt, a colour visitors cannot pick.
export const OWNER_CHOICE: Choice = { kind: "farmer", tint: 2 };

export function labelOf(kind: CharKind) {
  return kind === "fox" ? "Fox" : (VISITOR_CHARS.find((c) => c.kind === kind)?.label ?? "Visitor");
}

export function isKind(v: unknown): v is CharKind {
  return (
    v === "farmer" || v === "fox" || v === "bear" || v === "bunny" || v === "frog" || v === "chicken"
  );
}

// Where the top of the head is inside a 32px-tall sprite cell (for halos, name
// tags and emote bubbles to sit just above it).
export const HEAD_TOP: Record<CharKind, number> = {
  farmer: 4,
  fox: 6,
  bear: 8,
  bunny: 2,
  frog: 6,
  chicken: 6,
};
