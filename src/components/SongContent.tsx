import { Panel } from "@/components/Panel";
import { SongPlayer } from "@/components/SongPlayer";
import type { getAllSongs } from "@/lib/songs";

type Songs = Awaited<ReturnType<typeof getAllSongs>>;

// Shared by the /song route and the game's jukebox popup.
export function SongContent({ songs }: { songs: Songs }) {
  return (
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
              <SongPlayer src={song.url} title={song.title} artist={song.artist} />
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
