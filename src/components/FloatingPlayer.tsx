"use client";

import { useEffect, useRef, useState } from "react";
import { playerBus } from "@/lib/playerBus";
import { songKind, type SongKind } from "@/lib/songSource";

type Song = { id: string; title: string; artist: string; url: string };

// ---- YouTube and SoundCloud play through their own embedded players. Their
// scripts load once, the first time a song from that site is played.
type YTPlayer = {
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  setVolume(v: number): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  destroy(): void;
};
type SCWidget = {
  bind(event: string, fn: () => void): void;
  load(url: string, options: Record<string, unknown>): void;
  play(): void;
  pause(): void;
  setVolume(v: number): void;
  seekTo(ms: number): void;
};
type YTApi = {
  Player: new (
    el: HTMLElement,
    opts: {
      width: string;
      height: string;
      videoId: string;
      playerVars: Record<string, unknown>;
      events: { onReady: () => void; onStateChange: (e: { data: number }) => void; onError: () => void };
    },
  ) => YTPlayer;
};
type SCApi = { Widget: (frame: HTMLIFrameElement) => SCWidget };
type EmbedWindow = Window & { YT?: YTApi; onYouTubeIframeAPIReady?: () => void; SC?: SCApi };

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  let p = scripts.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`could not load ${src}`));
      document.head.appendChild(el);
    });
    scripts.set(src, p);
  }
  return p;
}
function loadYouTube(): Promise<YTApi> {
  const w = window as EmbedWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  return new Promise((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT as YTApi);
    };
    loadScript("https://www.youtube.com/iframe_api").catch(reject);
  });
}
async function loadSoundCloud(): Promise<SCApi> {
  const w = window as EmbedWindow;
  if (!w.SC) await loadScript("https://w.soundcloud.com/player/api.js");
  return w.SC as SCApi;
}
const scUrl = (track: string, autoPlay: boolean) =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(track)}&auto_play=${autoPlay}&visual=false&show_comments=false&hide_related=true&show_teaser=false`;

// A small, static (non-animated) sticky panel that controls a looping
// background song. It's rendered inside the public layout — which stays mounted
// across client-side navigation — so the audio, chosen track, and volume all
// carry over as you move between the home feed, posts, and other pages.
export function FloatingPlayer({ songs }: { songs: Song[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const ytReady = useRef(false);
  const scRef = useRef<SCWidget | null>(null);
  const scFrame = useRef<HTMLIFrameElement | null>(null);
  const playAfterSwitch = useRef(false);
  const desired = useRef(false); // should the current song be playing?
  const playingRef = useRef(false);
  const volumeRef = useRef(0.7);

  const [currentId, setCurrentId] = useState(songs[0]?.id);
  const [playing, setPlayingState] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [menuOpen, setMenuOpen] = useState(false);
  const [embedError, setEmbedError] = useState("");
  // Starts minimized (just a play/pause button) for a clearer view; the music
  // keeps playing either way.
  const [minimized, setMinPref] = useState(true);

  const current = songs.find((s) => s.id === currentId) ?? songs[0];
  const { kind, ref: songRef } = songKind(current?.url ?? "");
  const kindRef = useRef<SongKind>(kind);
  useEffect(() => {
    kindRef.current = kind; // (declared first so it is up to date for the effects below)
  });

  const setPlaying = (p: boolean) => {
    playingRef.current = p;
    setPlayingState(p);
  };

  // Stop everything except the kind that is playing now.
  function stopOthers(active: SongKind) {
    if (active !== "file") audioRef.current?.pause();
    if (active !== "youtube") ytRef.current?.pauseVideo();
    if (active !== "soundcloud") scRef.current?.pause();
  }

  function playNow() {
    desired.current = true;
    const k = kindRef.current;
    stopOthers(k);
    if (k === "file") audioRef.current?.play().catch(() => {});
    else if (k === "youtube") ytRef.current?.playVideo();
    else scRef.current?.play();
  }
  function pauseNow() {
    desired.current = false;
    audioRef.current?.pause();
    ytRef.current?.pauseVideo();
    scRef.current?.pause();
  }

  // Keep the button in sync with the actual audio state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => kindRef.current === "file" && setPlaying(true);
    const onPause = () => kindRef.current === "file" && setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  // Share state with the Song list and let it play / pause tracks here.
  useEffect(() => {
    playerBus.setState({ currentId, playing });
  }, [currentId, playing]);
  const pickRef = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    pickRef.current = pick;
  });
  useEffect(() => {
    playerBus.setPickHandler((id) => pickRef.current(id));
    return () => playerBus.setPickHandler(null);
  }, []);

  // Apply volume to whichever player is in use.
  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) audioRef.current.volume = volume;
    ytRef.current?.setVolume(Math.round(volume * 100));
    scRef.current?.setVolume(Math.round(volume * 100));
  }, [volume]);

  // When the track changes, load it in the right player and (if the switch came
  // from someone picking a song) start playing it.
  useEffect(() => {
    if (!current) return;
    const wantPlay = playAfterSwitch.current;
    playAfterSwitch.current = false;
    desired.current = wantPlay;
    setEmbedError("");
    let alive = true;
    const k = kindRef.current;
    stopOthers(k);

    if (k === "file") {
      const audio = audioRef.current;
      if (!audio) return;
      audio.load();
      audio.volume = volumeRef.current;
      if (wantPlay) audio.play().catch(() => {});
      else setPlaying(false);
    } else if (k === "youtube") {
      setPlaying(false);
      loadYouTube()
        .then((YT) => {
          if (!alive) return;
          const start = () => {
            if (!alive || kindRef.current !== "youtube") return;
            if (desired.current) ytRef.current?.loadVideoById(songRef);
            else ytRef.current?.cueVideoById(songRef);
          };
          if (ytRef.current && ytReady.current) return start();
          if (ytRef.current) return; // still starting: it plays the current song when ready
          const host = document.createElement("div");
          embedRef.current?.appendChild(host);
          ytRef.current = new YT.Player(host, {
            width: "100%",
            height: "122",
            videoId: songRef,
            playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
            events: {
              onReady: () => {
                ytReady.current = true;
                ytRef.current?.setVolume(Math.round(volumeRef.current * 100));
                if (desired.current && kindRef.current === "youtube") ytRef.current?.playVideo();
              },
              onStateChange: (e) => {
                if (kindRef.current !== "youtube") return;
                if (e.data === 1) setPlaying(true);
                else if (e.data === 2 || e.data === 5) setPlaying(false);
                else if (e.data === 0) {
                  ytRef.current?.seekTo(0, true); // loop, like the other songs
                  ytRef.current?.playVideo();
                }
              },
              onError: () => {
                setPlaying(false);
                setEmbedError("YouTube will not play this video here.");
              },
            },
          });
        })
        .catch(() => alive && setEmbedError("Could not load YouTube."));
    } else {
      setPlaying(false);
      loadSoundCloud()
        .then((SC) => {
          if (!alive || kindRef.current !== "soundcloud") return;
          if (scRef.current) {
            scRef.current.load(songRef, { auto_play: desired.current, visual: false, show_comments: false });
            return;
          }
          const frame = document.createElement("iframe");
          frame.allow = "autoplay";
          frame.title = "SoundCloud player";
          frame.src = scUrl(songRef, desired.current);
          embedRef.current?.appendChild(frame);
          scFrame.current = frame;
          const w = SC.Widget(frame);
          scRef.current = w;
          w.bind("ready", () => w.setVolume(Math.round(volumeRef.current * 100)));
          w.bind("play", () => kindRef.current === "soundcloud" && setPlaying(true));
          w.bind("pause", () => kindRef.current === "soundcloud" && setPlaying(false));
          w.bind("finish", () => {
            if (kindRef.current !== "soundcloud") return;
            w.seekTo(0); // loop
            w.play();
          });
          w.bind("error", () => setEmbedError("SoundCloud will not play this track here."));
        })
        .catch(() => alive && setEmbedError("Could not load SoundCloud."));
    }
    return () => {
      alive = false;
    };
    // everything else read here comes from refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // Take the embedded players down if the whole page goes away.
  useEffect(() => {
    return () => {
      try {
        ytRef.current?.destroy();
      } catch {
        /* ignore */
      }
      ytRef.current = null;
      scFrame.current?.remove();
      scRef.current = null;
    };
  }, []);

  // Close the song menu on an outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function toggle() {
    const willPlay = !playingRef.current;
    if (audioRef.current) audioRef.current.muted = false;
    if (willPlay) playNow();
    else pauseNow();
    // everyone in the town hears the same thing
    if (currentId) playerBus.announce(currentId, willPlay);
  }

  function pick(id: string) {
    setMenuOpen(false);
    if (id === currentId) {
      toggle();
      return;
    }
    playAfterSwitch.current = true; // picking a song plays it
    setCurrentId(id);
    playerBus.announce(id, true);
  }

  // Another player picked, played or paused a song: do the same here.
  function applyRemote(id: string, shouldPlay: boolean) {
    if (!songs.some((s) => s.id === id)) return;
    if (id !== currentId) {
      playAfterSwitch.current = shouldPlay;
      setCurrentId(id);
      return;
    }
    if (shouldPlay && !playingRef.current) playNow();
    else if (!shouldPlay && playingRef.current) pauseNow();
  }
  const remoteRef = useRef(applyRemote);
  useEffect(() => {
    remoteRef.current = applyRemote;
  });
  useEffect(() => {
    playerBus.setRemoteHandler((id, p) => remoteRef.current(id, p));
    return () => playerBus.setRemoteHandler(null);
  }, []);

  if (!current) return null;
  const hasLibrary = songs.length > 1;

  return (
    <div
      ref={containerRef}
      className={
        minimized
          ? "fixed right-4 bottom-4 z-40 flex items-center gap-1 rounded-full p-1.5"
          : "fixed right-4 bottom-4 z-40 w-60 rounded-xl px-3 py-2.5"
      }
      style={{
        background: "var(--menu-bar)",
        border: "3px solid var(--wood-dark)",
        boxShadow: "0 8px 20px rgba(8, 11, 36, 0.5), inset 0 0 0 2px #f0c48c",
        color: "#5c3416",
      }}
    >
      {minimized ? (
        <>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? `Pause ${current.title}` : `Play ${current.title}`}
            title={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95"
            style={{
              background: "var(--parchment-hi)",
              border: "2px solid var(--wood-dark)",
              color: "#5c3416",
            }}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            onClick={() => setMinPref(false)}
            aria-label="Open music player"
            title="Open player"
            className="flex h-9 items-center justify-center px-1.5 text-sm"
            style={{ color: "#5c3416", fontFamily: "var(--font-pixelify), monospace" }}
          >
            ♪ ▴
          </button>
        </>
      ) : (
        <>
      {/* Track row: play/pause + title (opens the song menu) */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${current.title}` : `Play ${current.title}`}
          title={playing ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95"
          style={{
            background: "var(--parchment-hi)",
            border: "2px solid var(--wood-dark)",
            color: "#5c3416",
          }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          type="button"
          onClick={() => hasLibrary && setMenuOpen((o) => !o)}
          aria-haspopup={hasLibrary ? "listbox" : undefined}
          aria-expanded={hasLibrary ? menuOpen : undefined}
          className={`flex min-w-0 flex-1 items-center gap-1 text-left ${
            hasLibrary ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <span className="min-w-0 leading-tight">
            <span
              className="block truncate text-sm font-semibold"
              style={{ fontFamily: "var(--font-pixelify), monospace" }}
            >
              ♪ {current.title}
            </span>
            <span className="block truncate text-xs" style={{ color: "#7a4a22" }}>
              {current.artist}
            </span>
          </span>
          {hasLibrary && <CaretIcon open={menuOpen} />}
        </button>
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setMinPref(true);
          }}
          aria-label="Minimize player"
          title="Minimize"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-lg leading-none"
          style={{ color: "#5c3416" }}
        >
          –
        </button>
      </div>

      {/* Volume row */}
      <div className="mt-2 flex items-center gap-2">
        <SpeakerIcon muted={volume === 0} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="h-1 w-full cursor-pointer"
          style={{ accentColor: "var(--wood-dark)" }}
        />
      </div>

      {/* Song menu (opens upward, above the panel) */}
      {menuOpen && hasLibrary && (
        <ul
          className="absolute right-0 bottom-full mb-2 max-h-56 w-full overflow-auto rounded-lg py-1"
          style={{
            background: "var(--parchment-hi)",
            border: "3px solid var(--wood-dark)",
            boxShadow: "0 8px 20px rgba(8, 11, 36, 0.5)",
          }}
        >
          {songs.map((s) => {
            const active = s.id === currentId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pick(s.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors"
                  style={{
                    background: active ? "var(--menu-bar)" : "transparent",
                    color: "#5c3416",
                  }}
                >
                  <span className="w-3 shrink-0">
                    {active && playing ? "♪" : active ? "•" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {s.title}
                      {songKind(s.url).kind !== "file" && (
                        <span className="ml-1 text-[10px] font-normal opacity-60">
                          {songKind(s.url).kind === "youtube" ? "▶ YouTube" : "☁ SoundCloud"}
                        </span>
                      )}
                    </span>
                    <span
                      className="block truncate text-xs"
                      style={{ color: "#7a4a22" }}
                    >
                      {s.artist}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

        </>
      )}

      {/* YouTube / SoundCloud players are added here by the code above. Shown small above the
          panel while it is open; otherwise parked off-screen so the music keeps playing. */}
      <div
        ref={embedRef}
        className={
          kind !== "file" && !minimized && !menuOpen
            ? "absolute right-0 bottom-full mb-2 w-60 overflow-hidden rounded-lg"
            : "pointer-events-none fixed -left-[9999px] top-0 w-60"
        }
        style={kind !== "file" && !minimized && !menuOpen ? { border: "3px solid var(--wood-dark)", background: "#000" } : undefined}
      />
      {kind !== "file" && !minimized && embedError && (
        <p className="mt-2 text-xs" style={{ color: "#a1352a" }}>
          {embedError}
        </p>
      )}
      <audio ref={audioRef} src={kind === "file" ? current.url : undefined} loop preload="none" />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function CaretIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
      style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="22" y2="15" />
          <line x1="22" y1="9" x2="16" y2="15" />
        </>
      ) : (
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      )}
    </svg>
  );
}
