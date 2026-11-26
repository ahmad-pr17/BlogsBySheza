import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/session";
import { normalizeSongLink } from "@/lib/songSource";

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

  const stored = typeof url === "string" ? normalizeSongLink(url) : null;
  if (!stored) {
    return NextResponse.json(
      { error: "That link is not something we can play (use a YouTube, SoundCloud or https audio link)." },
      { status: 400 },
    );
  }

  const song = await prisma.song.create({
    data: {
      title:
        typeof title === "string" && title.trim() ? title.trim() : "Untitled",
      url: stored,
      ...(typeof artist === "string" && artist.trim()
        ? { artist: artist.trim() }
        : {}),
    },
  });

  return NextResponse.json(song, { status: 201 });
}
