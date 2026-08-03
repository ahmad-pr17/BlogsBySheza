"use client";

import { useEffect, useRef, useState } from "react";

// The site-wide background track. Lives in public/songs (committed default).
const TRACK = {
  src: "/songs/magical-fantasy.mp3",
  title: "Magical Fantasy",
  artist: "Dmitriy",
};

// A small, static (non-animated) sticky panel that controls a looping
// background song. Because it's rendered inside the public layout — which stays
// mounted across client-side navigation — the audio keeps playing as you move
// between the home feed, posts, and other pages.
export function FloatingPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  // Keep the button in sync with the actual audio state (covers pause/play that
  // don't originate from our button, e.g. the OS media keys).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // The click is the user gesture browsers require to start audio.
      audio.play().catch(() => {
        /* play blocked — the next tap will retry */
      });
    } else {
      audio.pause();
    }
  }

  return (
    <div
      className="fixed right-4 bottom-4 z-40 flex items-center gap-3 rounded-xl px-3 py-2"
      style={{
        background: "var(--menu-bar)",
        border: "3px solid var(--wood-dark)",
        boxShadow:
          "0 8px 20px rgba(8, 11, 36, 0.5), inset 0 0 0 2px #f0c48c",
        color: "#5c3416",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${TRACK.title}` : `Play ${TRACK.title}`}
        title={playing ? "Pause" : "Play"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95"
        style={{
          background: "var(--parchment-hi)",
          border: "2px solid var(--wood-dark)",
          color: "#5c3416",
        }}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="min-w-0 leading-tight">
        <p
          className="truncate text-sm font-semibold"
          style={{ fontFamily: "var(--font-pixelify), monospace" }}
        >
          ♪ {TRACK.title}
        </p>
        <p className="truncate text-xs" style={{ color: "#7a4a22" }}>
          {TRACK.artist}
        </p>
      </div>

      <audio ref={audioRef} src={TRACK.src} loop preload="none" />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
