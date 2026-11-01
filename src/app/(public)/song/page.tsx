import type { Metadata } from "next";
import { SongContent } from "@/components/SongContent";
import { getAllSongs } from "@/lib/songs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Song — Sheza's Blogs",
  description: "A song to set the mood while you read.",
};

export default async function SongPage() {
  const songs = await getAllSongs();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <SongContent songs={songs} />
    </div>
  );
}
