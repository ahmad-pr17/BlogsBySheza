"use client";

import { useEffect, useRef, useState } from "react";

type Song = { id: string; title: string; artist: string; url: string };

// A small, static (non-animated) sticky panel that controls a looping
// background song. It's rendered inside the public layout — which stays mounted
// across client-side navigation — so the audio, chosen track, and volume all
// carry over as you move between the home feed, posts, and other pages.
export function FloatingPlayer({ songs }: { songs: Song[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playAfterSwitch = useRef(false);

  const [currentId, setCurrentId] = useState(songs[0]?.id);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [menuOpen, setMenuOpen] = useState(false);

  const current = songs.find((s) => s.id === currentId) ?? songs[0];

  // Keep the button in sync with the actual audio state.
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

  // Apply volume to the element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // When the track changes, load the new source and (if the switch came from a
  // user picking a song) start playing it.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    audio.volume = volume;
    if (playAfterSwitch.current) {
      playAfterSwitch.current = false;
      audio.play().catch(() => {
        /* play blocked — the play button will retry */
      });
    }
    // volume intentionally omitted: re-applied by its own effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // Close the song menu on an outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function pick(id: string) {
    setMenuOpen(false);
    if (id === currentId) {
      toggle();
      return;
    }
    playAfterSwitch.current = true; // picking a song plays it
    setCurrentId(id);
  }

  if (!current) return null;
  const hasLibrary = songs.length > 1;

  return (
    <div
      ref={containerRef}
      className="fixed right-4 bottom-4 z-40 w-60 rounded-xl px-3 py-2.5"
      style={{
        background: "var(--menu-bar)",
        border: "3px solid var(--wood-dark)",
        boxShadow: "0 8px 20px rgba(8, 11, 36, 0.5), inset 0 0 0 2px #f0c48c",
        color: "#5c3416",
      }}
    >
      {/* Track row: play/pause + title (opens the song menu) */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${current.title}` : `Play ${current.title}`}
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

        <button
          type="button"
          onClick={() => hasLibrary && setMenuOpen((o) => !o)}
          aria-haspopup={hasLibrary ? "listbox" : undefined}
          aria-expanded={hasLibrary ? menuOpen : undefined}
          className={`flex min-w-0 flex-1 items-center gap-1 text-left ${
            hasLibrary ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <span className="min-w-0 leading-tight">
            <span
              className="block truncate text-sm font-semibold"
              style={{ fontFamily: "var(--font-pixelify), monospace" }}
            >
              ♪ {current.title}
            </span>
            <span className="block truncate text-xs" style={{ color: "#7a4a22" }}>
              {current.artist}
            </span>
          </span>
          {hasLibrary && <CaretIcon open={menuOpen} />}
        </button>
      </div>

      {/* Volume row */}
      <div className="mt-2 flex items-center gap-2">
        <SpeakerIcon muted={volume === 0} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="h-1 w-full cursor-pointer"
          style={{ accentColor: "var(--wood-dark)" }}
        />
      </div>

      {/* Song menu (opens upward, above the panel) */}
      {menuOpen && hasLibrary && (
        <ul
          className="absolute right-0 bottom-full mb-2 max-h-56 w-full overflow-auto rounded-lg py-1"
          style={{
            background: "var(--parchment-hi)",
            border: "3px solid var(--wood-dark)",
            boxShadow: "0 8px 20px rgba(8, 11, 36, 0.5)",
          }}
        >
          {songs.map((s) => {
            const active = s.id === currentId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pick(s.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors"
                  style={{
                    background: active ? "var(--menu-bar)" : "transparent",
                    color: "#5c3416",
                  }}
                >
                  <span className="w-3 shrink-0">
                    {active && playing ? "♪" : active ? "•" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.title}</span>
                    <span
                      className="block truncate text-xs"
                      style={{ color: "#7a4a22" }}
                    >
                      {s.artist}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <audio ref={audioRef} src={current.url} loop preload="none" />
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

function CaretIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
      style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="22" y2="15" />
          <line x1="22" y1="9" x2="16" y2="15" />
        </>
      ) : (
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      )}
    </svg>
  );
}
