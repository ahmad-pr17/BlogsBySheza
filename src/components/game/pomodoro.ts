// The study-desk pomodoro timer. One timer is shared by everyone in the town:
// whoever starts, pauses or resets it changes it for all (see multiplayer.ts).
// Times are sent as "milliseconds left", so players' clocks never need to agree.

export type PomoPhase = "focus" | "short" | "long";

export type PomoWire = {
  phase: PomoPhase;
  running: boolean;
  left: number; // ms left in this phase, when it was sent
  cycle: number; // focus sessions finished so far (0..3, then a long break)
};

export const PHASE_MS: Record<PomoPhase, number> = {
  focus: 25 * 60 * 1000,
  short: 5 * 60 * 1000,
  long: 15 * 60 * 1000,
};
export const PHASE_LABEL: Record<PomoPhase, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

type State = { phase: PomoPhase; running: boolean; endsAt: number; left: number; cycle: number };

let st: State = { phase: "focus", running: false, endsAt: 0, left: PHASE_MS.focus, cycle: 0 };
let touched = false; // has anyone used the timer yet?
const listeners = new Set<() => void>();
let finishHandler: ((from: PomoPhase, to: PomoPhase) => void) | null = null;
let broadcast: ((w: PomoWire) => void) | null = null;

const emit = () => listeners.forEach((l) => l());

export const leftMs = (now = Date.now()) => (st.running ? Math.max(0, st.endsAt - now) : st.left);

function wire(): PomoWire {
  return { phase: st.phase, running: st.running, left: leftMs(), cycle: st.cycle };
}

function changed() {
  touched = true;
  emit();
  broadcast?.(wire());
}

// What follows a finished phase.
function after(phase: PomoPhase, cycle: number): { phase: PomoPhase; cycle: number } {
  if (phase === "focus") {
    const c = cycle + 1;
    return c >= 4 ? { phase: "long", cycle: 0 } : { phase: "short", cycle: c };
  }
  return { phase: "focus", cycle };
}

export const pomodoro = {
  get: () => st,
  wire: () => (touched ? wire() : null),
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  onFinish(fn: ((from: PomoPhase, to: PomoPhase) => void) | null) {
    finishHandler = fn;
  },
  setBroadcast(fn: ((w: PomoWire) => void) | null) {
    broadcast = fn;
  },
  start() {
    if (st.running) return;
    st = { ...st, running: true, endsAt: Date.now() + st.left };
    changed();
  },
  pause() {
    if (!st.running) return;
    st = { ...st, running: false, left: leftMs() };
    changed();
  },
  reset() {
    st = { phase: "focus", running: false, endsAt: 0, left: PHASE_MS.focus, cycle: 0 };
    changed();
  },
  skip() {
    const n = after(st.phase, st.cycle);
    st = { phase: n.phase, cycle: n.cycle, running: false, endsAt: 0, left: PHASE_MS[n.phase] };
    changed();
  },
  // The countdown reached zero: move on to the next phase (paused, ready to start).
  // Every player's clock does this on its own, at the same moment.
  tick(now = Date.now()) {
    if (!st.running || now < st.endsAt) return;
    const from = st.phase;
    const n = after(from, st.cycle);
    st = { phase: n.phase, cycle: n.cycle, running: false, endsAt: 0, left: PHASE_MS[n.phase] };
    touched = true;
    emit();
    finishHandler?.(from, n.phase);
  },
  // A message from another player (or the snapshot a newcomer gets).
  apply(w: PomoWire) {
    const left = Math.min(Math.max(0, w.left), PHASE_MS[w.phase]);
    st = {
      phase: w.phase,
      running: w.running,
      cycle: w.cycle,
      left,
      endsAt: w.running ? Date.now() + left : 0,
    };
    touched = true;
    emit();
  },
};

export function cleanPomoWire(v: unknown): PomoWire | null {
  const w = v as Partial<PomoWire> | null;
  if (!w || (w.phase !== "focus" && w.phase !== "short" && w.phase !== "long")) return null;
  if (typeof w.running !== "boolean" || typeof w.left !== "number" || !Number.isFinite(w.left)) return null;
  const cycle = Number.isInteger(w.cycle) && (w.cycle as number) >= 0 && (w.cycle as number) < 4 ? (w.cycle as number) : 0;
  return { phase: w.phase, running: w.running, left: w.left, cycle };
}

export function formatClock(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
