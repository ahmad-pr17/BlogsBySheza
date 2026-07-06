"use client";

import { useEffect, useRef, useState } from "react";

export function SongPlayer({
  src,
  title,
  artist,
}: {
  src: string;
  title: string;
  artist: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true);

  // When another player starts, reflect that this one is now muted.
  useEffect(() => {
    function onOtherPlay(e: Event) {
      const startedSrc = (e as CustomEvent<string>).detail;
      if (startedSrc !== src) setMuted(true);
    }
    window.addEventListener("songplayer:play", onOtherPlay);
    return () => window.removeEventListener("songplayer:play", onOtherPlay);
  }, [src]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    const next = !muted;
    setMuted(next);
    audio.muted = next;

    // Unmuting counts as the user gesture that lets playback start. Radio-style:
    // pause + mute every other track on the page so only one plays at a time.
    if (!next) {
      document.querySelectorAll("audio").forEach((el) => {
        if (el !== audio) {
          el.muted = true;
          el.pause();
        }
      });
      window.dispatchEvent(new CustomEvent("songplayer:play", { detail: src }));
      if (audio.paused) {
        audio.play().catch(() => {
          /* autoplay blocked — button click will retry */
        });
      }
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!muted}
        aria-label={muted ? `Unmute ${title}` : `Mute ${title}`}
        title={muted ? "Unmute" : "Mute"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition"
        style={{
          background: "var(--menu-bar)",
          border: "3px solid var(--wood-dark)",
          boxShadow: "inset 0 0 0 2px #f0c48c",
          color: "#5c3416",
        }}
      >
        {muted ? <SpeakerMutedIcon /> : <SpeakerOnIcon />}
      </button>
      <p style={{ color: "var(--ink)" }}>
        <span className="font-semibold">{title}</span>
        {" — "}
        {artist}
      </p>

      {/* Loops while playing; the button controls mute/unmute (and playback). */}
      <audio ref={audioRef} src={src} loop muted preload="none" />
    </div>
  );
}

function SpeakerOnIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function SpeakerMutedIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <line x1="16" y1="9" x2="22" y2="15" />
      <line x1="22" y1="9" x2="16" y2="15" />
    </svg>
  );
}
