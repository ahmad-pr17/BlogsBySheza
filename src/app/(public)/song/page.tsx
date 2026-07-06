import type { Metadata } from "next";
import { Panel } from "@/components/Panel";
import { SongPlayer } from "@/components/SongPlayer";
import { getSongs } from "@/lib/songs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Song — Sheza's Blogs",
  description: "A song to set the mood while you read.",
};

// The committed default track (lives in public/songs/). Always shown first.
const DEFAULT_SONG = {
  id: "default",
  title: "Magical Fantasy",
  artist: "Dmitriy",
  url: "/songs/magical-fantasy.mp3",
};

export default async function SongPage() {
  const uploaded = await getSongs();
  const songs = [DEFAULT_SONG, ...uploaded];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <Panel>
        <h1 className="text-2xl font-semibold sm:text-3xl" style={{ color: "var(--ink)" }}>
          Song
        </h1>
        <div
          className="mt-5 space-y-4 leading-relaxed"
          style={{ color: "var(--ink-body)" }}
        >
          <p>A little something to set the mood while you read.</p>
          <ul className="space-y-3">
            {songs.map((song) => (
              <li key={song.id}>
                <SongPlayer
                  src={song.url}
                  title={song.title}
                  artist={song.artist}
                />
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    </div>
  );
}
