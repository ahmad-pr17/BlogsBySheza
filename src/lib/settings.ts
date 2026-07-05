import {
  DEFAULT_TITLE_STYLE,
  isTitleStyle,
  type TitleStyle,
} from "@/lib/config";
import { prisma } from "@/lib/db";

const TITLE_STYLE_KEY = "titleStyle";

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
