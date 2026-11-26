"use client";

import "./extras.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { ROOM_NAMES } from "@/components/game/palace";
import { MAX_PAINTINGS, PAINT_H, PAINT_W, type Gallery } from "@/lib/galleryShared";

// Sheza's painting easel: a small pixel canvas. Hang the picture on any wall in
// the palace (you pick the spot by clicking the wall), or send it to the
// showroom. Pictures already hanging can be edited and moved or taken down.

const PALETTE = [
  "#3a2a22", "#795e53", "#aa7959", "#d79e61",
  "#a1352a", "#d9545c", "#f0a0a8", "#e8b66a",
  "#f6cf3f", "#8fb54f", "#3a6b3a", "#4a9fd0",
  "#2d4f9a", "#7180b1", "#6b4c9a", "#fbf5ef",
];
const PAPER = "#f7ecd0";
const UNDO_MAX = 20;

type Tool = "pen" | "eraser" | "fill";

export function Easel({
  gallery,
  onHang,
  onShowroom,
  onRemove,
  onClose,
  onSound,
}: {
  gallery: Gallery;
  onHang: (data: string, editId: string | null) => void; // close, then pick a wall
  onShowroom: (data: string, editId: string | null) => Promise<string | null>; // an error message, or null
  onRemove: (id: string) => Promise<string | null>;
  onClose: () => void;
  onSound?: (name: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const undo = useRef<ImageData[]>([]);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PALETTE[4]);
  const [size, setSize] = useState(2);
  const [editId, setEditId] = useState<string | null>(null); // the hanging painting being changed
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const ctx = () => ref.current?.getContext("2d", { willReadFrequently: true }) ?? null;

  const blank = useCallback(() => {
    const c = ctx();
    if (!c) return;
    c.fillStyle = PAPER;
    c.fillRect(0, 0, PAINT_W, PAINT_H);
  }, []);

  useEffect(() => {
    blank();
  }, [blank]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const snapshot = () => {
    const c = ctx();
    if (!c) return;
    undo.current.push(c.getImageData(0, 0, PAINT_W, PAINT_H));
    if (undo.current.length > UNDO_MAX) undo.current.shift();
  };

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * PAINT_W),
      y: Math.floor(((e.clientY - r.top) / r.height) * PAINT_H),
    };
  };

  const dab = (x: number, y: number) => {
    const c = ctx();
    if (!c) return;
    c.fillStyle = tool === "eraser" ? PAPER : color;
    const h = Math.floor(size / 2);
    c.fillRect(x - h, y - h, size, size);
  };

  // a straight run of dabs between two points, so quick strokes have no gaps
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) dab(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n));
  };

  const fill = (sx: number, sy: number) => {
    const c = ctx();
    if (!c || sx < 0 || sy < 0 || sx >= PAINT_W || sy >= PAINT_H) return;
    const img = c.getImageData(0, 0, PAINT_W, PAINT_H);
    const d = img.data;
    const hex = color.replace("#", "");
    const tr = parseInt(hex.slice(0, 2), 16);
    const tg = parseInt(hex.slice(2, 4), 16);
    const tb = parseInt(hex.slice(4, 6), 16);
    const i0 = (sy * PAINT_W + sx) * 4;
    const [r0, g0, b0] = [d[i0], d[i0 + 1], d[i0 + 2]];
    if (r0 === tr && g0 === tg && b0 === tb) return;
    const stack = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || y < 0 || x >= PAINT_W || y >= PAINT_H) continue;
      const i = (y * PAINT_W + x) * 4;
      if (d[i] !== r0 || d[i + 1] !== g0 || d[i + 2] !== b0) continue;
      d[i] = tr;
      d[i + 1] = tg;
      d[i + 2] = tb;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    c.putImageData(img, 0, 0);
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = at(e);
    snapshot();
    if (tool === "fill") {
      fill(p.x, p.y);
      onSound?.("pop");
      return;
    }
    drawing.current = p;
    dab(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const last = drawing.current;
    if (!last) return;
    const p = at(e);
    line(last.x, last.y, p.x, p.y);
    drawing.current = p;
  };
  const up = () => {
    drawing.current = null;
  };

  const undoLast = () => {
    const prev = undo.current.pop();
    const c = ctx();
    if (prev && c) c.putImageData(prev, 0, 0);
  };

  // Bring a hanging painting back onto the canvas to change it.
  const edit = (id: string) => {
    const p = gallery.find((x) => x.id === id);
    const c = ctx();
    if (!p || !c) return;
    snapshot();
    setEditId(id);
    const img = new Image();
    img.onload = () => {
      c.imageSmoothingEnabled = false;
      c.drawImage(img, 0, 0, PAINT_W, PAINT_H);
    };
    img.src = p.data;
  };

  const run = async (job: () => Promise<string | null>) => {
    setBusy(true);
    setMsg("");
    try {
      const err = await job();
      if (err) setMsg(err);
      else onSound?.("chime");
    } finally {
      setBusy(false);
    }
  };

  const png = () => ref.current?.toDataURL("image/png") ?? "";

  return (
    <div className="g-recipes" role="dialog" aria-modal="true" aria-label="Painting easel">
      <div className="g-recipes-card g-easel-card">
        <p className="g-pick-title">🎨 Painting easel</p>

        <canvas
          ref={ref}
          className="g-easel-canvas"
          width={PAINT_W}
          height={PAINT_H}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Painting canvas"
        />

        <div className="g-easel-palette" role="group" aria-label="Colours">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className="g-swatch"
              style={{ background: c }}
              aria-label={`Colour ${c}`}
              aria-pressed={color === c && tool !== "eraser"}
              onClick={() => {
                setColor(c);
                if (tool === "eraser") setTool("pen");
              }}
            />
          ))}
        </div>

        <div className="g-board-row">
          {(["pen", "fill", "eraser"] as Tool[]).map((t) => (
            <button key={t} type="button" className="g-gate-btn" aria-pressed={tool === t} onClick={() => setTool(t)}>
              {t === "pen" ? "🖌 Brush" : t === "fill" ? "🪣 Fill" : "🧽 Erase"}
            </button>
          ))}
          {[1, 2, 4].map((n) => (
            <button key={n} type="button" className="g-gate-btn" aria-pressed={size === n} onClick={() => setSize(n)}>
              {n === 1 ? "• S" : n === 2 ? "● M" : "⬤ L"}
            </button>
          ))}
          <button type="button" className="g-gate-btn" onClick={undoLast}>
            ↶ Undo
          </button>
          <button
            type="button"
            className="g-gate-btn"
            onClick={() => {
              snapshot();
              blank();
            }}
          >
            Clear
          </button>
        </div>

        <p className="g-tv-note">
          {editId ? "Changing a hanging painting. Hang it again to replace it." : "Done? Choose where it goes:"}
        </p>
        <div className="g-board-row">
          <button type="button" className="g-gate-btn" disabled={busy} onClick={() => onHang(png(), editId)}>
            🖼 Hang on a wall
          </button>
          <button
            type="button"
            className="g-gate-btn"
            disabled={busy}
            onClick={() => void run(() => onShowroom(png(), editId))}
          >
            🏛 Send to the showroom
          </button>
          {editId && (
            <button type="button" className="g-gate-btn" onClick={() => setEditId(null)}>
              Paint a new one
            </button>
          )}
        </div>
        {gallery.length > 0 && (
          <div className="g-hung">
            <p className="g-notes-title">
              Hanging in the palace ({gallery.length}/{MAX_PAINTINGS})
            </p>
            <ul className="g-hung-list">
              {gallery.map((p) => (
                <li key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.data} alt="" width={56} height={44} />
                  <span>{ROOM_NAMES[p.room]}</span>
                  <button type="button" className="g-gate-btn" disabled={busy} onClick={() => edit(p.id)}>
                    Edit / move
                  </button>
                  <button
                    type="button"
                    className="g-gate-btn"
                    disabled={busy}
                    onClick={() => void run(() => onRemove(p.id).then((e) => { if (!e && editId === p.id) setEditId(null); return e; }))}
                  >
                    Take down
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {msg && <p className="g-board-err">{msg}</p>}

        <button type="button" className="g-gate-btn" onClick={onClose} autoFocus>
          Put the brush down
        </button>
      </div>
    </div>
  );
}
