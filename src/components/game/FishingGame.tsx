"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./fishing.css";

type Rarity = "common" | "uncommon" | "rare" | "junk";
type Fish = {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  weight: number;
  min: number;
  max: number;
  joke: string;
};

const FISH: Fish[] = [
  { id: "sardine", name: "Sardine", emoji: "🐟", rarity: "common", weight: 14, min: 8, max: 20, joke: "Tiny, shiny and already regretting this." },
  { id: "carp", name: "Carp", emoji: "🐠", rarity: "common", weight: 14, min: 30, max: 70, joke: "Looks like it has opinions about your haircut." },
  { id: "minnow", name: "Minnow", emoji: "🐟", rarity: "common", weight: 14, min: 3, max: 9, joke: "Barely a snack. Maximum effort though." },
  { id: "bluegill", name: "Bluegill", emoji: "🐡", rarity: "common", weight: 12, min: 12, max: 28, joke: "Blue, gilled, and quite pleased with itself." },
  { id: "trout", name: "Trout", emoji: "🐟", rarity: "uncommon", weight: 7, min: 25, max: 60, joke: "A classic. Fish dad energy." },
  { id: "catfish", name: "Catfish", emoji: "🐱", rarity: "uncommon", weight: 6, min: 40, max: 110, joke: "Not a cat. Still judging you." },
  { id: "bass", name: "Bass", emoji: "🎣", rarity: "uncommon", weight: 6, min: 28, max: 65, joke: "Drops the bass. Also the bait." },
  { id: "puffer", name: "Pufferfish", emoji: "🐡", rarity: "uncommon", weight: 5, min: 10, max: 35, joke: "Puffed up with pride. Do not hug." },
  { id: "koi", name: "Golden Koi", emoji: "✨", rarity: "rare", weight: 2, min: 45, max: 90, joke: "Legend says it grants wishes. You wish for lunch." },
  { id: "eel", name: "Electric Eel", emoji: "⚡", rarity: "rare", weight: 2, min: 60, max: 150, joke: "Shocking! Your rod tingles." },
  { id: "rainbow", name: "Rainbow Trout", emoji: "🌈", rarity: "rare", weight: 2, min: 35, max: 75, joke: "Every colour except boring." },
  { id: "coelacanth", name: "Ancient Coelacanth", emoji: "🦕", rarity: "rare", weight: 1, min: 90, max: 180, joke: "Thought to be extinct. Rude to wake it." },
  { id: "boot", name: "Old Boot", emoji: "🥾", rarity: "junk", weight: 4, min: 20, max: 34, joke: "Left foot. The right one got away." },
  { id: "sock", name: "Soggy Sock", emoji: "🧦", rarity: "junk", weight: 3, min: 15, max: 30, joke: "Found its pair? No. Found its pond." },
  { id: "can", name: "Tin Can", emoji: "🥫", rarity: "junk", weight: 3, min: 8, max: 14, joke: "Beans not included." },
  { id: "bottle", name: "Message in a Bottle", emoji: "🍾", rarity: "junk", weight: 2, min: 18, max: 26, joke: "The note says: \"You are doing great. Keep going.\"" },
];

const SPEED: Record<Rarity, number> = { common: 0.8, uncommon: 1.2, rare: 1.8, junk: 0.5 };
const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare!",
  junk: "Junk",
};

type Entry = { count: number; best: number };
type Log = Record<string, Entry>;
type Phase = "idle" | "casting" | "waiting" | "bite" | "reeling" | "result" | "escaped";
type Result = { fish: Fish; size: number; isNew: boolean };

const KEY = "trail-fish";

function loadLog(): Log {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Log = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const e = v as Partial<Entry> | null;
      if (e && typeof e.count === "number" && typeof e.best === "number") {
        out[k] = { count: e.count, best: e.best };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveLog(log: Log) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* storage unavailable: game still works */
  }
}

function pickFish(): Fish {
  const total = FISH.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FISH) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FISH[0];
}

const ZONE = 0.3;
const CATCH_SECONDS = 3;

export function FishingGame(props: {
  onClose: () => void;
  onSound?: (name: string) => void;
}) {
  const { onClose, onSound } = props;
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [tab, setTab] = useState<"pond" | "book">("pond");
  const [log, setLog] = useState<Log>(() => loadLog());
  const [result, setResult] = useState<Result | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const logRef = useRef<Log>(log);
  const timerRef = useRef<number | null>(null);
  const fishRef = useRef<Fish | null>(null);
  const heldRef = useRef(false);
  const zoneEl = useRef<HTMLDivElement>(null);
  const markerEl = useRef<HTMLDivElement>(null);
  const fillEl = useRef<HTMLDivElement>(null);
  const soundRef = useRef(onSound);

  useEffect(() => {
    logRef.current = log;
  }, [log]);
  useEffect(() => {
    soundRef.current = onSound;
  }, [onSound]);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const sound = useCallback((n: string) => {
    try {
      soundRef.current?.(n);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const finishCatch = useCallback(() => {
    const fish = fishRef.current;
    if (!fish) return;
    const size = Math.round(fish.min + Math.random() * (fish.max - fish.min));
    const prev = logRef.current[fish.id];
    const next: Log = {
      ...logRef.current,
      [fish.id]: { count: (prev?.count ?? 0) + 1, best: Math.max(prev?.best ?? 0, size) },
    };
    logRef.current = next;
    setLog(next);
    saveLog(next);
    setResult({ fish, size, isNew: !prev });
    setPhase("result");
    sound(fish.rarity === "junk" ? "bad" : fish.rarity === "rare" ? "chime" : "good");
  }, [setPhase, sound]);

  const escape = useCallback(() => {
    clearTimer();
    setPhase("escaped");
    sound("bad");
  }, [clearTimer, setPhase, sound]);

  const cast = useCallback(() => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "escaped" && phaseRef.current !== "result") return;
    clearTimer();
    setResult(null);
    setPhase("casting");
    sound("tap");
    timerRef.current = window.setTimeout(() => {
      sound("splash");
      setPhase("waiting");
      const wait = 1500 + Math.random() * 3500;
      timerRef.current = window.setTimeout(() => {
        fishRef.current = pickFish();
        setPhase("bite");
        sound("splash");
        timerRef.current = window.setTimeout(escape, 900);
      }, wait);
    }, 700);
  }, [clearTimer, escape, setPhase, sound]);

  const hook = useCallback(() => {
    if (phaseRef.current === "waiting") {
      // pulled too early
      escape();
      return;
    }
    if (phaseRef.current !== "bite") return;
    clearTimer();
    heldRef.current = false;
    setPhase("reeling");
    sound("tap");
  }, [clearTimer, escape, setPhase, sound]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (e.repeat) return;
        const p = phaseRef.current;
        if (p === "reeling") heldRef.current = true;
        else if (p === "bite") hook();
        else if (p === "idle" || p === "escaped" || p === "result") cast();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") heldRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onClose, cast, hook]);

  // Reel mini-game
  useEffect(() => {
    if (phase !== "reeling") return;
    const fish = fishRef.current;
    if (!fish) return;
    const speed = SPEED[fish.rarity];
    let raf = 0;
    let last = 0;
    let zone = 0.35;
    let fishPos = 0.5;
    let target = 0.5;
    let retarget = 0;
    let progress = 0.3;
    let done = false;

    const tick = (t: number) => {
      if (done) return;
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
      last = t;
      retarget -= dt;
      if (retarget <= 0) {
        target = Math.random();
        retarget = (0.4 + Math.random() * 0.8) / speed;
      }
      fishPos += (target - fishPos) * Math.min(1, dt * 3.2 * speed);
      zone += (heldRef.current ? 0.6 : -0.5) * dt;
      zone = Math.max(0, Math.min(1 - ZONE, zone));
      const inside = fishPos >= zone && fishPos <= zone + ZONE;
      progress += (inside ? 1 / CATCH_SECONDS : -1 / (CATCH_SECONDS * 1.4)) * dt;
      if (zoneEl.current) {
        zoneEl.current.style.bottom = `${zone * 100}%`;
        zoneEl.current.style.height = `${ZONE * 100}%`;
      }
      if (markerEl.current) markerEl.current.style.bottom = `${fishPos * 96 + 2}%`;
      if (fillEl.current) fillEl.current.style.height = `${Math.max(0, Math.min(1, progress)) * 100}%`;
      if (progress >= 1) {
        done = true;
        finishCatch();
        return;
      }
      if (progress <= 0) {
        done = true;
        escape();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
    };
  }, [phase, finishCatch, escape]);

  const press = () => {
    heldRef.current = true;
  };
  const release = () => {
    heldRef.current = false;
  };

  const discovered = FISH.filter((f) => log[f.id]).length;

  let status = "";
  if (phase === "idle") status = "Ready when you are. Cast your line!";
  else if (phase === "casting") status = "Whoosh...";
  else if (phase === "waiting") status = "Waiting... stay calm.";
  else if (phase === "bite") status = "BITE! Quick!";
  else if (phase === "reeling") status = "Keep the fish in the gold zone!";
  else if (phase === "escaped") status = "It got away...";

  return (
    <div className="g-fish" role="dialog" aria-modal="true" aria-label="Fishing">
      <div className="g-fish-card">
        <div className="g-fish-head">
          <h2 className="g-fish-title g-pick-title">🎣 Fishing pond</h2>
          <button type="button" className="g-fish-btn g-fish-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="g-fish-tabs">
          <button type="button" className="g-fish-btn" aria-pressed={tab === "pond"} onClick={() => setTab("pond")}>
            Pond
          </button>
          <button type="button" className="g-fish-btn" aria-pressed={tab === "book"} onClick={() => setTab("book")}>
            Fish book {discovered}/{FISH.length}
          </button>
        </div>

        {tab === "book" ? (
          <div className="g-fish-book">
            {FISH.map((f) => {
              const e = log[f.id];
              return (
                <div key={f.id} className="g-fish-cell" data-locked={e ? "false" : "true"}>
                  <span className="g-fish-cell-emoji">{e ? f.emoji : "🔒"}</span>
                  <span>{e ? f.name : "???"}</span>
                  <small>{e ? `x${e.count} · best ${e.best} cm` : "undiscovered"}</small>
                </div>
              );
            })}
          </div>
        ) : phase === "result" && result ? (
          <div className="g-fish-result">
            <div className="g-fish-big">{result.fish.emoji}</div>
            <h3 className="g-fish-name">
              {result.fish.name}
              {result.isNew && <span className="g-fish-new">New!</span>}
            </h3>
            <p className="g-fish-size">
              {result.size} cm · {RARITY_LABEL[result.fish.rarity]}
            </p>
            <p className="g-fish-joke">{result.fish.joke}</p>
            <button type="button" className="g-fish-btn g-fish-primary" onClick={cast}>
              Cast again
            </button>
          </div>
        ) : (
          <>
            <div className="g-fish-scene" data-phase={phase} aria-hidden="true">
              <div className="g-fish-sun" />
              <div className="g-fish-cloud" />
              <div className="g-fish-water" />
              <div className="g-fish-wave" style={{ top: "55%", left: "20%" }} />
              <div className="g-fish-wave" style={{ top: "72%", left: "50%", animationDelay: "-1.5s" }} />
              <div className="g-fish-wave" style={{ top: "86%", left: "5%", animationDelay: "-3s" }} />
              <div className="g-fish-reed" style={{ right: "12px" }} />
              <div className="g-fish-reed" style={{ right: "40px", height: "54px", animationDelay: "-1s" }} />
              <div className="g-fish-rod" />
              <div className="g-fish-line" />
              <div className="g-fish-ripple" />
              <div className="g-fish-bobber" />
              {phase === "bite" && <div className="g-fish-bang">!</div>}
            </div>
            <p className="g-fish-status" role="status" aria-live="polite">
              {status}
            </p>
            {phase === "reeling" ? (
              <div className="g-fish-reel">
                <div className="g-fish-track" aria-hidden="true">
                  <div className="g-fish-zone" ref={zoneEl} style={{ bottom: "35%", height: `${ZONE * 100}%` }} />
                  <div className="g-fish-marker" ref={markerEl} style={{ bottom: "50%" }}>
                    🐟
                  </div>
                </div>
                <div className="g-fish-meter" aria-hidden="true">
                  <div className="g-fish-meter-fill" ref={fillEl} style={{ height: "30%" }} />
                </div>
                <button
                  type="button"
                  className="g-fish-btn g-fish-hold"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    press();
                  }}
                  onPointerUp={release}
                  onPointerCancel={release}
                  onPointerLeave={release}
                  onKeyDown={(e) => e.preventDefault()}
                >
                  Hold to reel
                  <br />
                  (Space)
                </button>
              </div>
            ) : phase === "bite" ? (
              <button type="button" className="g-fish-btn g-fish-primary" onClick={hook}>
                Hook it!
              </button>
            ) : phase === "waiting" ? (
              <button type="button" className="g-fish-btn g-fish-primary" onClick={hook}>
                Waiting... (don&apos;t pull yet)
              </button>
            ) : (
              <button
                type="button"
                className="g-fish-btn g-fish-primary"
                onClick={cast}
                disabled={phase === "casting"}
              >
                {phase === "escaped" ? "Try again" : "Cast (Space)"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
