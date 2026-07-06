import {
  autoPresetForHour,
  type BgMode,
  DEFAULT_BG_MODE,
  DEFAULT_TITLE_STYLE,
  getBgPreset,
  isBgMode,
  isTitleStyle,
  type TitleStyle,
} from "@/lib/config";
import { prisma } from "@/lib/db";

const TITLE_STYLE_KEY = "titleStyle";
const BG_MODE_KEY = "bgMode";
const BG_PRESET_KEY = "bgPreset";
const BG_CUSTOM_KEY = "bgCustom";

export async function getTitleStyle(): Promise<TitleStyle> {
  const row = await prisma.setting.findUnique({
    where: { key: TITLE_STYLE_KEY },
  });
  return isTitleStyle(row?.value) ? row.value : DEFAULT_TITLE_STYLE;
}

export async function setTitleStyle(style: TitleStyle) {
  await prisma.setting.upsert({
    where: { key: TITLE_STYLE_KEY },
    create: { key: TITLE_STYLE_KEY, value: style },
    update: { value: style },
  });
}

// The raw stored background choice, as shown in the admin picker.
export type BackgroundConfig = {
  mode: BgMode;
  preset: string | null;
  custom: string | null;
};

export async function getBackgroundConfig(): Promise<BackgroundConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [BG_MODE_KEY, BG_PRESET_KEY, BG_CUSTOM_KEY] } },
  });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const rawMode = byKey[BG_MODE_KEY];
  return {
    mode: isBgMode(rawMode) ? rawMode : DEFAULT_BG_MODE,
    preset: byKey[BG_PRESET_KEY] ?? null,
    custom: byKey[BG_CUSTOM_KEY] ?? null,
  };
}

export async function setBackgroundConfig(config: BackgroundConfig) {
  const entries: [string, string][] = [
    [BG_MODE_KEY, config.mode],
    [BG_PRESET_KEY, config.preset ?? ""],
    [BG_CUSTOM_KEY, config.custom ?? ""],
  ];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
}

// What the page actually renders: the image URL to show (null = generated
// theme), whether to overlay a legibility scrim, and whether to draw the
// generated mountains. The starfield is always drawn on top regardless.
export type ResolvedBackground = {
  src: string | null;
  scrim: boolean;
  mountains: boolean;
};

export async function resolveBackground(
  now: Date = new Date(),
): Promise<ResolvedBackground> {
  const { mode, preset, custom } = await getBackgroundConfig();

  if (mode === "custom" && custom) {
    return { src: custom, scrim: true, mountains: false };
  }
  if (mode === "preset") {
    const p = getBgPreset(preset);
    if (p) return { src: p.src, scrim: !p.dark, mountains: false };
  }
  if (mode === "auto") {
    const p = autoPresetForHour(now.getHours());
    return { src: p.src, scrim: !p.dark, mountains: false };
  }
  // "theme" (or any unset/invalid combo): generated sky + mountains.
  return { src: null, scrim: false, mountains: true };
}
