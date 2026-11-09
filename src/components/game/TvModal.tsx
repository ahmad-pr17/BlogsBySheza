"use client";

import "./extras.css";
import { useEffect, useRef, useState } from "react";
import { drawTvPicture, TV_CHANNELS } from "@/components/game/palace";

// The living-room TV, full screen. Channel 1 is a palace drama (original
// pixel art), 2 a fireplace, 3 a cooking show.
export function TvModal({
  channel,
  onChannel,
  onClose,
  onSound,
}: {
  channel: number; // 1..3
  onChannel: (n: number) => void;
  onClose: () => void;
  onSound?: (name: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef(channel);
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    live.current = channel;
  }, [channel]);

  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext("2d");
    if (!cv || !c) return;
    c.imageSmoothingEnabled = false;
    let raf = 0;
    const draw = (now: number) => {
      drawTvPicture(c, 0, 0, cv.width, cv.height, reduced ? 0 : now / 1000, live.current);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        onChannel((live.current % TV_CHANNELS.length) + 1);
        onSound?.("click");
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        onChannel(((live.current + TV_CHANNELS.length - 2) % TV_CHANNELS.length) + 1);
        onSound?.("click");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onChannel, onSound]);

  return (
    <div className="g-recipes" role="dialog" aria-modal="true" aria-label="Television">
      <div className="g-recipes-card g-tv-card">
        <canvas ref={ref} className="g-tv-screen" width={240} height={150} aria-hidden="true" />
        <p className="g-tv-title">
          📺 Channel {channel}: {TV_CHANNELS[channel - 1]}
        </p>
        <div className="g-board-row">
          {TV_CHANNELS.map((name, i) => (
            <button
              key={name}
              type="button"
              className="g-gate-btn"
              aria-pressed={channel === i + 1}
              onClick={() => {
                onChannel(i + 1);
                onSound?.("click");
              }}
            >
              {i + 1} · {name}
            </button>
          ))}
        </div>
        <p className="g-tv-note">The full story is on the shelf in the study. Arrow keys change channel.</p>
        <button type="button" className="g-gate-btn" onClick={onClose} autoFocus>
          Turn off
        </button>
      </div>
    </div>
  );
}
