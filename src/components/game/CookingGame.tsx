"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Recipe, Step } from "./RecipeBook";
import "./cooking.css";

type Props = {
  recipe: Recipe;
  onFinish: (stars: 1 | 2 | 3) => void;
  onCancel: () => void;
  onSound?: (name: string) => void;
};

type StepProps = {
  step: never;
  idx: number;
  onMistake: () => void;
  onDone: () => void;
  sound: (name: string) => void;
};

const RESULT_LINES: Record<1 | 2 | 3, string[]> = {
  3: ["Chef's kiss! Flawless.", "The whole town is smelling this.", "Michelin who? You."],
  2: ["Tasty! A few happy accidents.", "Rustic, they'll say.", "Mostly perfect, mostly."],
  1: ["Edible! Probably. Serve it with a smile.", "Bold. Very bold.", "It's the thought that counts."],
};

function useTimers() {
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
}

function isQuit(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && typeof t.closest === "function" && !!t.closest("[data-cook-quit]");
}

function AddStep({
  step,
  onMistake,
  onDone,
  sound,
}: Omit<StepProps, "step"> & { step: Extract<Step, { kind: "add" }> }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);
  const later = useTimers();
  const total = step.items.filter((i) => i.right).length;

  const pick = (name: string, right: boolean) => {
    if (picked.includes(name) || picked.length >= total) return;
    if (!right) {
      sound("bad");
      onMistake();
      setShake(name);
      later(() => setShake(null), 380);
      return;
    }
    const next = [...picked, name];
    setPicked(next);
    sound(next.length === total ? "good" : "tap");
    if (next.length === total) later(onDone, 450);
  };

  return (
    <div className="g-cook-area">
      <div className="g-cook-items">
        {step.items.map((it) => {
          const inn = picked.includes(it.name);
          return (
            <button
              key={it.name}
              type="button"
              className={`g-cook-item${inn ? " g-cook-item-in" : ""}${shake === it.name ? " g-cook-shake" : ""}`}
              aria-pressed={inn}
              onClick={() => pick(it.name, it.right)}
            >
              <span>{inn ? "✅" : it.icon}</span>
              {it.name}
            </button>
          );
        })}
      </div>
      <p className="g-cook-left">
        {picked.length >= total ? "All in!" : `Add the right ones: ${total - picked.length} to go`}
      </p>
    </div>
  );
}

function TapStep({
  step,
  onDone,
  sound,
}: Omit<StepProps, "step"> & { step: Extract<Step, { kind: "tap" }> }) {
  const [count, setCount] = useState(0);
  const [pop, setPop] = useState(false);
  const later = useTimers();
  const countRef = useRef(0);
  const finished = count >= step.taps;

  const hit = useCallback(() => {
    if (countRef.current >= step.taps) return;
    countRef.current += 1;
    setCount(countRef.current);
    setPop(true);
    later(() => setPop(false), 90);
    if (countRef.current >= step.taps) {
      sound("good");
      later(onDone, 450);
    } else {
      sound("tap");
    }
  }, [step.taps, later, onDone, sound]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== " " && e.key !== "Enter") || isQuit(e)) return;
      e.preventDefault();
      if (!e.repeat) hit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hit]);

  return (
    <div className="g-cook-area">
      <button
        type="button"
        autoFocus
        className={`g-cook-big${pop ? " g-cook-pop" : ""}`}
        disabled={finished}
        onPointerDown={(e) => {
          e.preventDefault();
          hit();
        }}
        onClick={() => {}}
      >
        <span>{step.icon}</span>
        {finished ? "Done!" : `${step.verb}! (tap or Space)`}
      </button>
      <div className="g-cook-bar" role="progressbar" aria-valuemin={0} aria-valuemax={step.taps} aria-valuenow={count}>
        <div className="g-cook-fill" style={{ width: `${(count / step.taps) * 100}%` }} />
      </div>
    </div>
  );
}

function HeatStep({
  step,
  idx,
  onMistake,
  onDone,
  sound,
}: Omit<StepProps, "step"> & { step: Extract<Step, { kind: "heat" }> }) {
  const [result, setResult] = useState<{ good: boolean; msg: string } | null>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const later = useTimers();
  const zoneStart = 0.12 + ((idx * 0.27) % 0.5);
  const stopped = result !== null;

  useEffect(() => {
    sound("sizzle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stopped) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speed = step.speed * (reduced ? 0.45 : 1);
    let raf = 0;
    let t0: number | null = null;
    const frame = (now: number) => {
      if (t0 === null) t0 = now;
      const phase = (((now - t0) / 1000) * speed) % 2;
      posRef.current = phase < 1 ? phase : 2 - phase;
      if (markerRef.current) markerRef.current.style.left = `${posRef.current * 100}%`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stopped, step.speed]);

  const press = useCallback(() => {
    if (stopped) return;
    const p = posRef.current;
    if (p >= zoneStart && p <= zoneStart + step.zone) {
      sound("good");
      setResult({ good: true, msg: "Perfect!" });
    } else {
      sound("bad");
      onMistake();
      setResult({
        good: false,
        msg: p < zoneStart ? "A little underdone... still tasty!" : "Slightly overdone... still fine!",
      });
    }
    later(onDone, 950);
  }, [stopped, zoneStart, step.zone, sound, onMistake, onDone, later]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== " " && e.key !== "Enter") || isQuit(e)) return;
      e.preventDefault();
      if (!e.repeat) press();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <div className="g-cook-area">
      <div className="g-cook-heat" aria-hidden="true">
        <div className="g-cook-zone" style={{ left: `${zoneStart * 100}%`, width: `${step.zone * 100}%` }} />
        <div className="g-cook-marker" ref={markerRef} />
      </div>
      <button
        type="button"
        autoFocus
        className="g-cook-big"
        disabled={stopped}
        onPointerDown={(e) => {
          e.preventDefault();
          press();
        }}
        onClick={() => {}}
      >
        <span>{step.icon}</span>
        Now! (tap or Space)
      </button>
      <p className="g-cook-msg" aria-live="polite">
        {result ? result.msg : "Press when the marker is in the green."}
      </p>
    </div>
  );
}

export function CookingGame({ recipe, onFinish, onCancel, onSound }: Props) {
  const [idx, setIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [line, setLine] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const total = recipe.steps.length;
  const done = idx >= total;
  const stars: 1 | 2 | 3 = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  const sound = useCallback((n: string) => onSound?.(n), [onSound]);
  const onMistake = useCallback(() => setMistakes((m) => m + 1), []);
  const onStepDone = useCallback(() => {
    setIdx((i) => i + 1);
    setLine(Math.floor(Math.random() * 3));
  }, []);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (done) onSound?.("chime");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const step = recipe.steps[idx];
  const common = { idx, onMistake, onDone: onStepDone, sound };

  return (
    <div className="g-recipes" role="dialog" aria-modal="true" aria-label={`Cooking ${recipe.name}`}>
      <div className="g-cook-card" ref={rootRef} tabIndex={-1}>
        <div className="g-cook-head">
          <p className="g-cook-title">
            {recipe.icon} {recipe.name}
          </p>
          <button type="button" className="g-cook-quit" data-cook-quit onClick={onCancel}>
            Quit
          </button>
        </div>
        <div className="g-cook-pips" aria-hidden="true">
          {recipe.steps.map((_, i) => (
            <span
              key={i}
              className={`g-cook-pip${i < idx ? " g-cook-pip-done" : i === idx ? " g-cook-pip-now" : ""}`}
            />
          ))}
        </div>
        {done ? (
          <div className="g-cook-done">
            <div className="g-cook-dish">{recipe.icon}</div>
            <div className="g-cook-stars" aria-label={`${stars} stars`}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={n <= stars ? "" : "g-cook-stars-off"}>
                  ★
                </span>
              ))}
            </div>
            <p className="g-cook-result">{RESULT_LINES[stars][line]}</p>
            <button type="button" autoFocus className="g-gate-btn g-gate-primary g-cook-serve" onClick={() => onFinish(stars)}>
              Serve it!
            </button>
          </div>
        ) : (
          <>
            <p className="g-cook-step">
              Step {idx + 1} of {total}
            </p>
            <p className="g-cook-text">{step.text}</p>
            {step.kind === "add" && <AddStep key={idx} step={step} {...common} />}
            {step.kind === "tap" && <TapStep key={idx} step={step} {...common} />}
            {step.kind === "heat" && <HeatStep key={idx} step={step} {...common} />}
          </>
        )}
      </div>
    </div>
  );
}
