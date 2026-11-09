"use client";

import "./extras.css";
import { useEffect, useState } from "react";
import {
  BOARD_LIMITS,
  cleanBoard,
  DEFAULT_BOARDS,
  type BoardId,
  type BoardText,
} from "@/lib/boardText";

// Owner / superadmin: change the words on one of the notice boards.
export function BoardEditor({
  id,
  value,
  onSaved,
  onClose,
}: {
  id: BoardId;
  value: BoardText;
  onSaved: (board: BoardText) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(value.title);
  const [lines, setLines] = useState(value.lines.join("\n"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tooLong = lines
    .split("\n")
    .some((l) => l.trim().length > BOARD_LIMITS.lineLength);
  const lineCount = lines.split("\n").filter((l) => l.trim()).length;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const board = cleanBoard({ title, lines: lines.split("\n") });
    if (!board) {
      setErr("Write something on the board first.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, board }),
      });
      if (!res.ok) {
        setErr(res.status === 401 ? "You need to be logged in to do that." : "Could not save. Try again.");
        return;
      }
      onSaved(board);
    } catch {
      setErr("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="g-recipes" role="dialog" aria-modal="true" aria-label="Edit the board">
      <form className="g-recipes-card g-board-card" onSubmit={save}>
        <p className="g-pick-title">🪧 Edit the board</p>
        <label>
          Title
          <input
            value={title}
            maxLength={BOARD_LIMITS.title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          Words (one line per row)
          <textarea
            rows={7}
            value={lines}
            onChange={(e) => setLines(e.target.value)}
            spellCheck
          />
          <small>
            Up to {BOARD_LIMITS.lines} lines of {BOARD_LIMITS.lineLength} letters. Now:{" "}
            {lineCount} {lineCount === 1 ? "line" : "lines"}
            {tooLong ? " (long lines get cut)" : ""}.
          </small>
        </label>
        {err && <p className="g-board-err">{err}</p>}
        <div className="g-board-row">
          <button type="submit" className="g-gate-btn" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="g-gate-btn"
            onClick={() => {
              setTitle(DEFAULT_BOARDS[id].title);
              setLines(DEFAULT_BOARDS[id].lines.join("\n"));
            }}
          >
            Original words
          </button>
          <button type="button" className="g-gate-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
