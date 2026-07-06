import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/session";

// Proxies Giphy search so the API key never reaches the browser.
type GiphyItem = {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string };
    fixed_height_small: { url: string };
  };
};

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GIPHY_API_KEY is not set" },
      { status: 501 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://api.giphy.com/v1/gifs/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "24");
  url.searchParams.set("rating", "pg-13");
  url.searchParams.set("bundle", "fixed_height");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Giphy request failed" },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { data: GiphyItem[] };
  const results = data.data.map((item) => ({
    id: item.id,
    title: item.title || "gif",
    url: item.images.fixed_height.url,
    preview: item.images.fixed_height_small.url,
  }));

  return NextResponse.json({ results });
}
