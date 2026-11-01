"use client";

import { useSyncExternalStore } from "react";
import { playerBus } from "@/lib/playerBus";

// One row of the song list. It has no audio of its own: it plays / pauses this
// track on the floating player, so only one song ever plays and the music keeps
// going after the popup closes.
export function SongPlayer({
  id,
  title,
  artist,
}: {
  id: string;
  title: string;
  artist: string;
}) {
  const state = useSyncExternalStore(
    playerBus.subscribe,
    playerBus.getState,
    playerBus.getState,
  );
  const playing = state.currentId === id && state.playing;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => playerBus.pick(id)}
        aria-pressed={playing}
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        title={playing ? "Pause" : "Play"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition active:scale-95"
        style={{
          background: "var(--menu-bar)",
          border: "3px solid var(--wood-dark)",
          boxShadow: "inset 0 0 0 2px #f0c48c",
          color: "#5c3416",
        }}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <p style={{ color: "var(--ink)" }}>
        <span className="font-semibold">{title}</span>
        {" — "}
        {artist}
        {playing && (
          <span className="ml-2 text-sm" style={{ color: "#7a4a22" }}>
            ♪ now playing
          </span>
        )}
      </p>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
