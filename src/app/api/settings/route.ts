import { NextResponse } from "next/server";
import { getBgPreset, isBgMode, isTitleStyle } from "@/lib/config";
import { isAdminAuthenticated } from "@/lib/session";
import {
  getBackgroundConfig,
  getTitleStyle,
  setBackgroundConfig,
  setTitleStyle,
} from "@/lib/settings";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    titleStyle: await getTitleStyle(),
    background: await getBackgroundConfig(),
  });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  // Title style (from the wordmark picker).
  if (body?.titleStyle !== undefined) {
    if (!isTitleStyle(body.titleStyle)) {
      return NextResponse.json(
        { error: "titleStyle must be one of a, b, c, d" },
        { status: 400 },
      );
    }
    await setTitleStyle(body.titleStyle);
    return NextResponse.json({ titleStyle: body.titleStyle });
  }

  // Background (from the background picker).
  if (body?.background !== undefined) {
    const { mode, preset, custom } = body.background ?? {};

    if (!isBgMode(mode)) {
      return NextResponse.json(
        { error: "background.mode must be one of theme, preset, custom, auto" },
        { status: 400 },
      );
    }
    if (mode === "preset" && !getBgPreset(preset)) {
      return NextResponse.json(
        { error: "background.preset is not a known preset" },
        { status: 400 },
      );
    }
    if (mode === "custom" && (typeof custom !== "string" || !custom)) {
      return NextResponse.json(
        { error: "background.custom must be a non-empty image URL" },
        { status: 400 },
      );
    }

    const config = {
      mode,
      preset: typeof preset === "string" ? preset : null,
      custom: typeof custom === "string" ? custom : null,
    };
    await setBackgroundConfig(config);
    return NextResponse.json({ background: config });
  }

  return NextResponse.json(
    { error: "Nothing to update" },
    { status: 400 },
  );
}
