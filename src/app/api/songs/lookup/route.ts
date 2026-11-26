import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/session";
import { normalizeSongLink, songKind } from "@/lib/songSource";

export const dynamic = "force-dynamic";

// Admin only: paste a YouTube / SoundCloud / audio link and get back the form we
// store plus the title and artist, so the Songs page can fill them in.
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const input = new URL(request.url).searchParams.get("url") ?? "";
  const url = normalizeSongLink(input);
  if (!url) {
    return NextResponse.json({ error: "Not a YouTube, SoundCloud or https audio link." }, { status: 400 });
  }

  const { kind, ref } = songKind(url);
  let title = "";
  let artist = "";
  if (kind !== "file") {
    // both sites publish a public "oEmbed" description of a track (no key needed)
    const endpoint =
      kind === "youtube"
        ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ref}`)}`
        : `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(ref)}`;
    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const d = (await res.json()) as { title?: string; author_name?: string };
        title = String(d.title ?? "").slice(0, 120);
        artist = String(d.author_name ?? "").slice(0, 80);
      } else if (kind === "youtube") {
        return NextResponse.json({ error: "YouTube says that video can't be embedded or doesn't exist." }, { status: 422 });
      } else {
        return NextResponse.json({ error: "SoundCloud says that track can't be embedded or doesn't exist." }, { status: 422 });
      }
    } catch {
      /* no title found: the admin can type one */
    }
  }
  return NextResponse.json({ url, kind, title, artist });
}
