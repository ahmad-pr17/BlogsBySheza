// The wordmark presets. The active one is stored in the database (Setting
// key "titleStyle") and changed from the admin Appearance page. This is only
// the fallback used before anything has been chosen.
//   a = Cozy glow  b = Neon pixel  c = Gothic parchment  d = Minimal modern
export type TitleStyle = "a" | "b" | "c" | "d";

export const DEFAULT_TITLE_STYLE: TitleStyle = "a";

export const TITLE_EYEBROWS: Record<TitleStyle, string> = {
  a: "welcome to",
  b: "— dev log —",
  c: "the writings of",
  d: "notes on making things",
};

export const TITLE_STYLE_OPTIONS: {
  value: TitleStyle;
  label: string;
  description: string;
}[] = [
  { value: "a", label: "Cozy glow", description: "Warm cream + gold, soft glow" },
  { value: "b", label: "Neon pixel", description: "Arcade pink + teal pixel type" },
  { value: "c", label: "Gothic parchment", description: "Elegant serif with a rule" },
  { value: "d", label: "Minimal modern", description: "Clean sans, single gold accent" },
];

export function isTitleStyle(value: unknown): value is TitleStyle {
  return value === "a" || value === "b" || value === "c" || value === "d";
}
