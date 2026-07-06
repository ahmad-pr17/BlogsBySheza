import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/session";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stickers = await prisma.sticker.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(stickers);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, url, category } = body ?? {};

  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const sticker = await prisma.sticker.create({
    data: {
      name: typeof name === "string" && name.trim() ? name.trim() : "sticker",
      url,
      ...(typeof category === "string" && category.trim()
        ? { category: category.trim() }
        : {}),
    },
  });

  return NextResponse.json(sticker, { status: 201 });
}
