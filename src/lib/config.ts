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

// ---------------------------------------------------------------------------
// Page background
//
// The active background is stored across three Setting keys:
//   bgMode   — how the image is chosen (see BgMode)
//   bgPreset — which bundled preset (when mode = "preset")
//   bgCustom — uploaded image URL (when mode = "custom")
// The starfield is always drawn on top; generated mountains show only in
// "theme" mode. See resolveBackground() in lib/settings.ts.
// ---------------------------------------------------------------------------

//   theme  = generated night sky + mountains (no image)
//   preset = one of the bundled BG_PRESETS
//   custom = an uploaded image URL
//   auto   = a preset chosen by the current time of day
export type BgMode = "theme" | "preset" | "custom" | "auto";

export const DEFAULT_BG_MODE: BgMode = "theme";

export function isBgMode(value: unknown): value is BgMode {
  return (
    value === "theme" ||
    value === "preset" ||
    value === "custom" ||
    value === "auto"
  );
}

export type BgPreset = {
  id: string;
  label: string;
  src: string;
  // Whether the image is dark enough that a light scrim keeps text readable.
  dark: boolean;
};

export const BG_PRESETS: BgPreset[] = [
  { id: "night", label: "Starlit Night", src: "/backgrounds/night.svg", dark: true },
  { id: "sunset", label: "Sunset Ridge", src: "/backgrounds/sunset.svg", dark: false },
  { id: "day", label: "Bright Day", src: "/backgrounds/day.svg", dark: false },
];

export function getBgPreset(id: unknown): BgPreset | null {
  return BG_PRESETS.find((p) => p.id === id) ?? null;
}

// Time-of-day rotation for "auto" mode, using the server's local hour.
//   day     09:00–17:00
//   sunset  05:00–09:00 and 17:00–20:00 (dawn + dusk share the warm scene)
//   night   20:00–05:00
export function autoPresetForHour(hour: number): BgPreset {
  const byId = (id: string) => getBgPreset(id) ?? BG_PRESETS[0];
  if (hour >= 9 && hour < 17) return byId("day");
  if ((hour >= 5 && hour < 9) || (hour >= 17 && hour < 20)) return byId("sunset");
  return byId("night");
}
