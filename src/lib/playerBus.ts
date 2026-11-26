// A tiny shared store so the Song list can drive the one FloatingPlayer audio
// element (there must only ever be a single <audio> playing).

export type PlayerState = { currentId: string | undefined; playing: boolean };

let state: PlayerState = { currentId: undefined, playing: false };
let pickHandler: ((id: string) => void) | null = null;
const listeners = new Set<() => void>();
let remoteHandler: ((id: string, playing: boolean) => void) | null = null;
let localListener: ((id: string, playing: boolean) => void) | null = null;

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
  // Shared music: the game tells everyone when you pick / play / pause a song
  // (the player calls announce), and plays along when someone else does
  // (the player registers how, and the game calls applyRemote).
  announce(id: string, playing: boolean) {
    localListener?.(id, playing);
  },
  setLocalListener(fn: ((id: string, playing: boolean) => void) | null) {
    localListener = fn;
  },
  setRemoteHandler(fn: ((id: string, playing: boolean) => void) | null) {
    remoteHandler = fn;
  },
  applyRemote(id: string, playing: boolean) {
    remoteHandler?.(id, playing);
  },
};
