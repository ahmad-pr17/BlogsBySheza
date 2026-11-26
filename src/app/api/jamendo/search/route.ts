import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

// Admin only: search Jamendo's free (Creative Commons) catalogue. The page
// shows the results with a preview, and adds the chosen ones as normal songs.
// Needs JAMENDO_CLIENT_ID (free, from devportal.jamendo.com) in the environment.
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Jamendo is not set up yet: add JAMENDO_CLIENT_ID to the environment." },
      { status: 503 },
    );
  }

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const tag = (params.get("tag") ?? "").trim().slice(0, 40);

  const api = new URL("https://api.jamendo.com/v3.0/tracks/");
  api.searchParams.set("client_id", clientId);
  api.searchParams.set("format", "json");
  api.searchParams.set("limit", "20");
  api.searchParams.set("audioformat", "mp32");
  api.searchParams.set("order", "popularity_month");
  api.searchParams.set("include", "licenses");
  if (q) api.searchParams.set("search", q);
  if (tag) api.searchParams.set("tags", tag);

  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return NextResponse.json({ error: "Jamendo did not answer. Try again." }, { status: 502 });
    const data = (await res.json()) as {
      results?: {
        id: string;
        name: string;
        artist_name: string;
        audio: string;
        image?: string;
        duration?: number;
        license_ccurl?: string;
        shareurl?: string;
      }[];
    };
    const tracks = (data.results ?? [])
      .filter((t) => typeof t.audio === "string" && t.audio.startsWith("https://"))
      .map((t) => ({
        id: String(t.id),
        title: String(t.name).slice(0, 120),
        artist: String(t.artist_name).slice(0, 80),
        audio: t.audio,
        image: t.image ?? "",
        duration: t.duration ?? 0,
        license: t.license_ccurl ?? "",
        page: t.shareurl ?? "",
      }));
    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ error: "Could not reach Jamendo." }, { status: 502 });
  }
}
