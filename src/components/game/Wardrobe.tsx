"use client";

import "./extras.css";
import { useEffect, useRef, useState } from "react";
import type { Art, Img } from "@/components/game/art";
import {
  drawFlowerCrown,
  drawHairExtras,
  drawOutfit,
  HAIR_COLORS,
  HAIR_STYLES,
  hairSheet,
  OUTFITS,
  outfitSwatch,
  type Style,
} from "@/components/game/style";

const LW = 30; // logical size of one picture
const LH = 34;

// Draw the farmer in a style, front on or turned, at a given scale.
function renderChar(c: CanvasRenderingContext2D, art: Art, tint: number, style: Style, dir: number, t: number, scale: number) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, LW * scale, LH * scale);
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.imageSmoothingEnabled = false;
  const base = (art.chars.farmer?.[tint] ?? art.chars.farmer?.[0] ?? art.char) as Img;
  const sheet = hairSheet(base, style.hairColor);
  const px = LW / 2;
  const py = LH - 3;
  c.fillStyle = "rgba(60,40,20,0.22)";
  c.fillRect(px - 6, py - 2, 12, 2);
  c.drawImage(sheet, dir * 16, 32, 16, 32, px - 8, py - 30, 16, 32);
  if (style.outfit > 0) drawOutfit(c, OUTFITS[style.outfit], px, py, dir, 1, t, false);
  drawHairExtras(c, px, py, dir, 1, style.hairStyle, style.hairColor, t, false);
  drawFlowerCrown(c, px, py, dir, 1);
}

function Thumb({ art, tint, style, scale = 3 }: { art: Art; tint: number; style: Style; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { outfit, hairStyle, hairColor } = style;
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (c) renderChar(c, art, tint, { outfit, hairStyle, hairColor }, 4, 1.2, scale);
  }, [art, tint, outfit, hairStyle, hairColor, scale]);
  return <canvas ref={ref} width={LW * scale} height={LH * scale} className="g-ward-thumb" aria-hidden="true" />;
}

// Sheza's wardrobe: pick a dress and a hairstyle, and see them from every side.
export function Wardrobe({
  art,
  tint,
  value,
  startTab,
  onChange,
  onClose,
}: {
  art: Art;
  tint: number;
  value: Style;
  startTab: "dress" | "hair";
  onChange: (s: Style) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"dress" | "hair">(startTab);
  const preview = useRef<HTMLCanvasElement>(null);
  const styleRef = useRef(value);
  const dirRef = useRef({ i: 0, manual: false, last: 0 });
  const ORDER = [4, 3, 2, 1, 0, 7, 6, 5];

  useEffect(() => {
    styleRef.current = value;
  }, [value]);

  useEffect(() => {
    const c = preview.current?.getContext("2d");
    if (!c) return;
    let raf = 0;
    const draw = (now: number) => {
      const d = dirRef.current;
      if (!d.manual && now - d.last > 1500) {
        d.i = (d.i + 1) % 8;
        d.last = now;
      }
      renderChar(c, art, tint, styleRef.current, ORDER[d.i], now / 1000, 6);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, tint]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const turn = (by: number) => {
    const d = dirRef.current;
    d.manual = true;
    d.i = (d.i + by + 8) % 8;
  };

  return (
    <div className="g-recipes" role="dialog" aria-modal="true" aria-label="Sheza's wardrobe">
      <div className="g-recipes-card g-ward-card">
        <div className="g-ward-head">
          <p className="g-pick-title">👗 Sheza&apos;s wardrobe</p>
          <button type="button" className="g-ward-x" onClick={onClose} aria-label="Close the wardrobe">
            ✕
          </button>
        </div>

        <div className="g-ward-stage">
          <button type="button" className="g-ward-turn" onClick={() => turn(-1)} aria-label="Turn left">
            ◀
          </button>
          <canvas ref={preview} width={LW * 6} height={LH * 6} className="g-ward-preview" aria-hidden="true" />
          <button type="button" className="g-ward-turn" onClick={() => turn(1)} aria-label="Turn right">
            ▶
          </button>
        </div>
        <p className="g-ward-now">
          {OUTFITS[value.outfit].name} · {HAIR_STYLES[value.hairStyle]} {HAIR_COLORS[value.hairColor].name.toLowerCase()} hair
        </p>

        <div className="g-ward-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "dress"} className={tab === "dress" ? "on" : ""} onClick={() => setTab("dress")}>
            👗 Dresses
          </button>
          <button type="button" role="tab" aria-selected={tab === "hair"} className={tab === "hair" ? "on" : ""} onClick={() => setTab("hair")}>
            💇 Hair
          </button>
        </div>

        {tab === "dress" ? (
          <div className="g-ward-grid">
            {OUTFITS.map((o, i) => (
              <button
                key={o.name}
                type="button"
                className={`g-ward-opt${value.outfit === i ? " on" : ""}`}
                aria-pressed={value.outfit === i}
                title={o.name}
                onClick={() => onChange({ ...value, outfit: i })}
              >
                <Thumb art={art} tint={tint} style={{ ...value, outfit: i }} />
                <span>{o.name.replace(" gown", "").replace(" frock", "")}</span>
                <small style={{ color: outfitSwatch(i) }}>{i === 0 ? "" : o.long ? "gown" : "frock"}</small>
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="g-ward-label">Hairstyle</p>
            <div className="g-ward-grid">
              {HAIR_STYLES.map((h, i) => (
                <button
                  key={h}
                  type="button"
                  className={`g-ward-opt${value.hairStyle === i ? " on" : ""}`}
                  aria-pressed={value.hairStyle === i}
                  onClick={() => onChange({ ...value, hairStyle: i })}
                >
                  <Thumb art={art} tint={tint} style={{ ...value, hairStyle: i }} />
                  <span>{h}</span>
                </button>
              ))}
            </div>
            <p className="g-ward-label">Hair colour</p>
            <div className="g-ward-colors">
              {HAIR_COLORS.map((h, i) => (
                <button
                  key={h.name}
                  type="button"
                  className={`g-ward-color${value.hairColor === i ? " on" : ""}`}
                  aria-pressed={value.hairColor === i}
                  aria-label={h.name}
                  title={h.name}
                  style={{ background: `linear-gradient(135deg, ${h.light}, ${h.base} 55%, ${h.shade})` }}
                  onClick={() => onChange({ ...value, hairColor: i })}
                />
              ))}
            </div>
          </>
        )}

        <button type="button" className="g-gate-btn" onClick={onClose} autoFocus>
          Done
        </button>
      </div>
    </div>
  );
}
