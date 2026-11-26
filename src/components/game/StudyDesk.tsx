"use client";

import "./extras.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import { formatClock, leftMs, PHASE_LABEL, PHASE_MS, pomodoro } from "@/components/game/pomodoro";
import { sound } from "@/components/game/sound";

// Sheza's study desk: a pomodoro timer everyone in the town shares, sticky
// notes for your own to-do list (kept in this browser only) and lo-fi music.

const NOTES_KEY = "study-notes";
const COLORS = ["#fff2a8", "#ffd1dc", "#c9f0d2", "#cfe3ff", "#ffdcb8"];
const MAX_NOTES = 12;

type Note = { id: number; text: string; done: boolean; color: number };

function loadNotes(): Note[] {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((n) => n && typeof n.text === "string")
      .slice(0, MAX_NOTES)
      .map((n, i) => ({
        id: typeof n.id === "number" ? n.id : i,
        text: String(n.text).slice(0, 80),
        done: n.done === true,
        color: Number.isInteger(n.color) ? Math.abs(n.color) % COLORS.length : 0,
      }));
  } catch {
    return [];
  }
}

export function StudyDesk({ onClose, onSound }: { onClose: () => void; onSound?: (name: string) => void }) {
  const st = useSyncExternalStore(pomodoro.subscribe, pomodoro.get, pomodoro.get);
  const [now, setNow] = useState(() => Date.now());
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [draft, setDraft] = useState("");
  const lofi = useSyncExternalStore(sound.subscribe, sound.lofiOn, () => false);

  // the clock face updates every half second while the desk is open
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch {
      /* ignore */
    }
  }, [notes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const left = leftMs(now);
  const total = PHASE_MS[st.phase];
  const pct = Math.max(0, Math.min(100, (1 - left / total) * 100));
  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!text || notes.length >= MAX_NOTES) return;
    setNotes((n) => [...n, { id: Date.now(), text, done: false, color: n.length % COLORS.length }]);
    setDraft("");
    onSound?.("tap");
  };

  return (
    <div className="g-recipes" role="dialog" aria-modal="true" aria-label="Study desk">
      <div className="g-recipes-card g-desk-card">
        <p className="g-pick-title">📚 Study desk</p>

        <div className="g-pomo" data-phase={st.phase}>
          <p className="g-pomo-phase">
            {PHASE_LABEL[st.phase]} {st.phase === "focus" && <small>· session {st.cycle + 1} of 4</small>}
          </p>
          <p className="g-pomo-time" aria-live="off">
            {formatClock(left)}
          </p>
          <div className="g-pomo-bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="g-board-row">
            <button
              type="button"
              className="g-gate-btn"
              onClick={() => {
                onSound?.("click");
                if (st.running) pomodoro.pause();
                else pomodoro.start();
              }}
            >
              {st.running ? "⏸ Pause" : left < total ? "▶ Resume" : "▶ Start"}
            </button>
            <button
              type="button"
              className="g-gate-btn"
              onClick={() => {
                onSound?.("click");
                pomodoro.skip();
              }}
            >
              ⏭ Skip
            </button>
            <button
              type="button"
              className="g-gate-btn"
              onClick={() => {
                onSound?.("click");
                pomodoro.reset();
              }}
            >
              ↺ Reset
            </button>
          </div>
          <p className="g-tv-note">One timer for everyone in the town, so we can study together.</p>
        </div>

        <div className="g-board-row">
          <button
            type="button"
            className="g-gate-btn"
            aria-pressed={lofi}
            onClick={() => {
              if (lofi) sound.lofiStop();
              else sound.lofiStart();
            }}
          >
            {lofi ? "🎧 Lo-fi: on" : "🎧 Lo-fi: off"}
          </button>
        </div>

        <div className="g-notes">
          <p className="g-notes-title">📝 To-do notes (only you see these)</p>
          <ul className="g-notes-list">
            {notes.map((n) => (
              <li key={n.id} className={`g-note${n.done ? " done" : ""}`} style={{ background: COLORS[n.color] }}>
                <label>
                  <input
                    type="checkbox"
                    checked={n.done}
                    onChange={() => {
                      setNotes((all) => all.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)));
                      onSound?.(n.done ? "tap" : "good");
                    }}
                  />
                  <span>{n.text}</span>
                </label>
                <button
                  type="button"
                  className="g-note-x"
                  aria-label={`Remove note: ${n.text}`}
                  onClick={() => setNotes((all) => all.filter((x) => x.id !== n.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {notes.length === 0 && <p className="g-tv-note">No notes yet. What do you want to get done today?</p>}
          <form className="g-notes-add" onSubmit={addNote}>
            <input
              value={draft}
              maxLength={80}
              placeholder={notes.length >= MAX_NOTES ? "The board is full" : "Add a to-do…"}
              disabled={notes.length >= MAX_NOTES}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="New to-do note"
            />
            <button type="submit" className="g-gate-btn" disabled={!draft.trim() || notes.length >= MAX_NOTES}>
              Stick it
            </button>
          </form>
        </div>

        <button type="button" className="g-gate-btn" onClick={onClose} autoFocus>
          Stand up
        </button>
      </div>
    </div>
  );
}
