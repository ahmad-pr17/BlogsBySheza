// A tiny shared store so the Song list can drive the one FloatingPlayer audio
// element (there must only ever be a single <audio> playing).

export type PlayerState = { currentId: string | undefined; playing: boolean };

let state: PlayerState = { currentId: undefined, playing: false };
let pickHandler: ((id: string) => void) | null = null;
const listeners = new Set<() => void>();

export const playerBus = {
  getState: () => state,
  setState(next: PlayerState) {
    if (next.currentId === state.currentId && next.playing === state.playing) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  // FloatingPlayer registers how to play / pause a track.
  setPickHandler(fn: ((id: string) => void) | null) {
    pickHandler = fn;
  },
  pick(id: string) {
    pickHandler?.(id);
  },
};
