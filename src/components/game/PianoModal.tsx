"use client";

import "./extras.css";
import { useCallback, useEffect, useState } from "react";
import { sound } from "@/components/game/sound";

// Two octaves, C4 to B5. White keys play on the home row, black keys on the
// row above (like a tracker keyboard).
const WHITE = ["C", "D", "E", "F", "G", "A", "B"];
const SEMI = [0, 2, 4, 5, 7, 9, 11];
const WHITE_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "z", "x", "c"];
// black key after white index i (none after E and B), as [whiteIndex, semitone]
const BLACKS: [number, number, string][] = [
  [0, 1, "w"], [1, 3, "e"], [3, 6, "t"], [4, 8, "y"], [5, 10, "u"],
  [7, 13, "o"], [8, 15, "p"], [10, 18, "["], [11, 20, "]"], [12, 22, "\\"],
];

const freq = (semitonesFromC4: number) => 261.63 * Math.pow(2, semitonesFromC4 / 12);

export function PianoModal({ onClose }: { onClose: () => void }) {
  const [down, setDown] = useState<Set<number>>(new Set());

  const press = useCallback((semi: number) => {
    sound.note(freq(semi));
    setDown((d) => new Set(d).add(semi));
    window.setTimeout(() => {
      setDown((d) => {
        const n = new Set(d);
        n.delete(semi);
        return n;
      });
    }, 160);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const wi = WHITE_KEYS.indexOf(k);
      if (wi >= 0) {
        press(Math.floor(wi / 7) * 12 + SEMI[wi % 7]);
        return;
      }
      const b = BLACKS.find(([, , key]) => key === k);
      if (b) press(b[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, press]);

  const total = WHITE_KEYS.length;
  return (
    <div className="g-recipes" role="dialog" aria-modal="true" aria-label="Piano">
      <div className="g-recipes-card g-piano-card">
        <p className="g-pick-title">🎹 Piano</p>
        <div className="g-piano-keys">
          {Array.from({ length: total }, (_, i) => {
            const semi = Math.floor(i / 7) * 12 + SEMI[i % 7];
            return (
              <button
                key={i}
                type="button"
                className={`g-piano-white${down.has(semi) ? " on" : ""}`}
                onPointerDown={() => press(semi)}
                aria-label={`${WHITE[i % 7]}${4 + Math.floor(i / 7)}`}
              >
                {WHITE_KEYS[i]}
              </button>
            );
          })}
          {BLACKS.map(([wi, semi]) => (
            <button
              key={semi}
              type="button"
              className={`g-piano-black${down.has(semi) ? " on" : ""}`}
              style={{ left: `${((wi + 1) / total) * 100}%` }}
              onPointerDown={() => press(semi)}
              aria-label={`Black key ${semi}`}
            />
          ))}
        </div>
        <p className="g-tv-note">Tap the keys, or play with your keyboard (A S D F… and W E T Y U…).</p>
        <button type="button" className="g-gate-btn" onClick={onClose} autoFocus>
          Close the lid
        </button>
      </div>
    </div>
  );
}
