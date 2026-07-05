import { NextResponse } from "next/server";
import { isTitleStyle } from "@/lib/config";
import { isAdminAuthenticated } from "@/lib/session";
import { getTitleStyle, setTitleStyle } from "@/lib/settings";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ titleStyle: await getTitleStyle() });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const titleStyle = body?.titleStyle;

  if (!isTitleStyle(titleStyle)) {
    return NextResponse.json(
      { error: "titleStyle must be one of a, b, c, d" },
      { status: 400 },
    );
  }

  await setTitleStyle(titleStyle);
  return NextResponse.json({ titleStyle });
}
