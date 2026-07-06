import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/session";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const songs = await prisma.song.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(songs);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { title, artist, url } = body ?? {};

  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const song = await prisma.song.create({
    data: {
      title:
        typeof title === "string" && title.trim() ? title.trim() : "Untitled",
      url,
      ...(typeof artist === "string" && artist.trim()
        ? { artist: artist.trim() }
        : {}),
    },
  });

  return NextResponse.json(song, { status: 201 });
}
