"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostModal } from "@/components/game/PostModal";
import { loadArt, type Art } from "@/components/game/art";
import { buildGround, type Ground } from "@/components/game/ground";
import {
  buildHome,
  buildHomeBg,
  drawHomeScene,
  type HomeDrawState,
} from "@/components/game/home";
import {
  buildWorld,
  planRoute,
  tileBlocked,
  T,
  type Stop,
} from "@/components/game/world";

const SPEED = 62; // logical px / second
const NEAR = 30; // how close counts as "at" an interactable
const SUBSCRIBE = "__subscribe";
const ABOUT = "__about";
const SONG = "__song";
const ADMIN = "__admin";
const READ_KEY = "trail-read";
const PAGE_URL: Record<string, string> = {
  [ABOUT]: "/?page=about",
  [SONG]: "/?page=song",
  [ADMIN]: "/?page=admin",
};
const BIG = new Set(["about", "admin", "home"]); // house-sized interactables
const DISHES: [string, string][] = [
  ["dishStew", "mushroom stew"],
  ["dishBread", "honey bread"],
  ["dishPie", "berry pie"],
  ["dishSoup", "garden soup"],
];

type Scene = "out" | "home";

// Minimap colours (Sprout Lands palette).
const MINI = {
  grass: [143, 181, 79],
  edge: [88, 128, 62],
  path: [217, 160, 102],
  water: [74, 159, 208],
  tree: [58, 107, 58],
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function GameWorld({
  stops,
  nodes,
  initialSlug,
  initialPage,
}: {
  stops: Stop[];
  nodes: Record<string, ReactNode>;
  initialSlug?: string;
  initialPage?: "about" | "song" | "admin";
}) {
  const router = useRouter();
  const world = useMemo(() => buildWorld(stops), [stops]);
  const home = useMemo(() => buildHome(), []);
  const scenes = useMemo(() => ({ out: world, home }), [world, home]);

  const initialInteract = initialSlug
    ? world.interacts.find((i) => i.slug === initialSlug)
    : undefined;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const [helpPref, setHelpPref] = useState<boolean | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(
    initialInteract?.slug ?? (initialPage ? `__${initialPage}` : null),
  );
  const [nearId, setNearId] = useState<string | null>(null);
  const [readCount, setReadCount] = useState(0);
  const [assets, setAssets] = useState<{
    art: Art;
    ground: Ground;
    homeBg: HTMLCanvasElement;
  } | null>(null);
  const [scene, setScene] = useState<Scene>("out");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );

  // Mutable game state lives in a ref so the frame loop never re-renders React.
  const g = useRef({
    x: initialInteract ? initialInteract.spotX : world.start.x,
    y: initialInteract ? initialInteract.spotY : world.start.y,
    dir: 4, // column in the character sheet (4 = facing down)
    walkT: 0,
    moving: false,
    keys: new Set<string>(),
    joy: { x: 0, y: 0 },
    target: null as { x: number; y: number; arrive: string | null } | null,
    route: [] as { x: number; y: number }[], // waypoints on the way to target
    stuck: 0,
    near: null as string | null,
    open: openKey !== null,
    read: new Set<string>(),
    camX: 0,
    camY: 0,
    S: 3,
    dpr: 1,
    // town / home
    scene: "out" as Scene,
    busy: false, // fading, cooking or sleeping: no walking
    fade: null as null | { t: number; dur: number; phase: "out" | "in"; cb: () => void },
    sleep: null as null | { t: number; flipped: boolean },
    cook: -1, // 0..1 while cooking
    dish: null as string | null,
    dishName: "",
    night: false,
    heartT: -99,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const persistRead = useCallback(() => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...g.current.read]));
    } catch {
      /* private mode etc. */
    }
    setReadCount(
      [...g.current.read].filter((id) => world.interacts.some((i) => i.id === id))
        .length,
    );
  }, [world]);

  const openModal = useCallback((key: string, url: string) => {
    g.current.open = true;
    g.current.target = null;
    g.current.keys.clear();
    setOpenKey(key);
    window.history.replaceState(null, "", url);
  }, []);

  const closeModal = useCallback(() => {
    g.current.open = false;
    setOpenKey(null);
    window.history.replaceState(null, "", "/");
  }, []);

  const fadeTo = useCallback((cb: () => void) => {
    const s = g.current;
    s.busy = true;
    s.target = null;
    s.keys.clear();
    s.fade = { t: 0, dur: 0.35, phase: "out", cb };
  }, []);

  const switchScene = useCallback(
    (to: Scene) => {
      const s = g.current;
      s.scene = to;
      s.near = null;
      setNearId(null);
      setScene(to);
      if (to === "home") {
        s.x = home.start.x;
        s.y = home.start.y;
        s.dir = 0;
      } else {
        const door = world.interacts.find((i) => i.id === "home");
        if (door) {
          s.x = door.spotX;
          s.y = door.spotY;
        }
        s.dir = 4;
      }
    },
    [home, world],
  );

  const handleAct = useCallback(
    (what: string) => {
      const s = g.current;
      switch (what) {
        case "leave":
          fadeTo(() => switchScene("out"));
          break;
        case "sleep":
          s.busy = true;
          s.target = null;
          s.keys.clear();
          s.sleep = { t: 0, flipped: false };
          break;
        case "cook":
          if (s.dish) {
            showToast(`The table already has ${s.dishName}. Eat it first!`);
            break;
          }
          s.busy = true;
          s.target = null;
          s.keys.clear();
          s.dir = 0;
          s.cook = 0;
          break;
        case "eat":
          if (!s.dish) {
            showToast("The table is empty. Cook something first!");
          } else {
            showToast(`Yum! You ate the ${s.dishName}.`);
            s.dish = null;
          }
          break;
        case "pet":
          s.heartT = performance.now() / 1000;
          showToast("Purrrr…");
          break;
        case "books":
          showToast("Dev logs, sketchbooks and half-finished plans.");
          break;
      }
    },
    [fadeTo, switchScene, showToast],
  );

  const activate = useCallback(
    (id: string) => {
      const it = scenes[g.current.scene].interacts.find((i) => i.id === id);
      if (!it) return;
      if (it.kind === "enter") {
        fadeTo(() => switchScene("home"));
      } else if (it.kind === "act" && it.act) {
        handleAct(it.act);
      } else if (it.kind === "post" && it.slug) {
        g.current.read.add(it.id);
        persistRead();
        openModal(it.slug, `/?post=${it.slug}`);
      } else if (it.kind === "modal" && it.modal) {
        openModal(it.modal, PAGE_URL[it.modal] ?? "/");
      } else if (it.href) {
        router.push(it.href);
      }
    },
    [scenes, persistRead, openModal, router, fadeTo, switchScene, handleAct],
  );

  const goTo = useCallback(
    (id: string) => {
      const it = scenes[g.current.scene].interacts.find((i) => i.id === id);
      if (!it || g.current.open || g.current.busy) return;
      if (g.current.near === id) {
        activate(id);
        return;
      }
      const s = g.current;
      s.target = { x: it.spotX, y: it.spotY, arrive: id };
      s.route = planRoute(scenes[s.scene], s.x, s.y, it.spotX, it.spotY) ?? [];
      s.stuck = 0;
    },
    [scenes, activate],
  );

  // Latest callbacks for the long-lived frame loop.
  const act = useRef({ activate, goTo, toast: showToast });
  useEffect(() => {
    act.current = { activate, goTo, toast: showToast };
  }, [activate, goTo, showToast]);

  // Restore read marks and lock page scroll.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(READ_KEY) ?? "[]");
      if (Array.isArray(saved))
        for (const id of saved) if (typeof id === "string") g.current.read.add(id);
    } catch {
      /* ignore */
    }
    if (initialInteract) g.current.read.add(initialInteract.id);
    persistRead();
    document.documentElement.classList.add("game-lock");
    document.body.classList.add("game-lock");
    return () => {
      document.documentElement.classList.remove("game-lock");
      document.body.classList.remove("game-lock");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the tile/sprite art, then build the grass layer for this world.
  useEffect(() => {
    let alive = true;
    loadArt()
      .then((art) => {
        if (alive)
          setAssets({ art, ground: buildGround(world, art), homeBg: buildHomeBg(art) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [world]);

  // The game loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !assets) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { art, ground, homeBg } = assets;
    const s = g.current;
    const cur = () => scenes[s.scene];
    const family =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-pixelify")
        .trim() || "monospace";

    const resize = () => {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const target = cw < 640 ? 2 : cw < 1100 ? 3 : 4;
      s.dpr = dpr;
      s.S = Math.max(1, Math.round(target * dpr));
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    };
    // Minimap: the whole trail as a small vertical strip, built once.
    const mini = document.createElement("canvas");
    mini.width = 44;
    mini.height = world.rows;
    {
      const mc = mini.getContext("2d")!;
      const img = mc.createImageData(44, world.rows);
      const put = (i: number, col: number[]) => {
        img.data[i * 4] = col[0];
        img.data[i * 4 + 1] = col[1];
        img.data[i * 4 + 2] = col[2];
        img.data[i * 4 + 3] = 255;
      };
      for (let i = 0; i < 44 * world.rows; i++) {
        const k = world.kind[i];
        put(i, k === 1 ? MINI.path : k === 2 ? MINI.water : MINI.grass);
      }
      for (const o of world.objects) {
        if (!/^(tree|pine)/.test(o.key)) continue;
        const c = Math.floor(o.x / T);
        const r = Math.floor((o.y - 1) / T);
        if (c >= 0 && c < 44 && r >= 0 && r < world.rows) put(r * 44 + c, MINI.tree);
      }
      mc.putImageData(img, 0, 0);
    }
    const mapCv = mapRef.current;
    let mapW = 0;
    let mapH = 0;
    const sizeMap = () => {
      if (!mapCv) return;
      const hCss = clamp(Math.round(window.innerHeight * 0.4), 150, 340);
      const wCss = Math.max(34, Math.round((hCss * 44) / world.rows));
      mapW = Math.round(wCss * s.dpr);
      mapH = Math.round(hCss * s.dpr);
      mapCv.width = mapW;
      mapCv.height = mapH;
      mapCv.style.width = `${wCss}px`;
      mapCv.style.height = `${hCss}px`;
    };
    const drawMap = (t: number) => {
      const mctx = mapCv?.getContext("2d");
      if (!mctx || !mapCv) return;
      const kx = mapW / world.w;
      const ky = mapH / world.h;
      mctx.imageSmoothingEnabled = false;
      mctx.clearRect(0, 0, mapW, mapH);
      mctx.drawImage(mini, 0, 0, 44, world.rows, 0, 0, mapW, mapH);
      // what's on screen
      mctx.strokeStyle = "rgba(255,255,255,0.9)";
      mctx.lineWidth = Math.max(1, Math.round(s.dpr));
      mctx.strokeRect(
        Math.round(s.camX * kx) + 0.5,
        Math.round(s.camY * ky) + 0.5,
        Math.round((canvas.width / s.S) * kx),
        Math.round((canvas.height / s.S) * ky),
      );
      const d = Math.max(3, Math.round(3 * s.dpr));
      const dot = (x: number, y: number, col: string) => {
        mctx.fillStyle = "#3a2a18";
        mctx.fillRect(Math.round(x * kx - d / 2) - 1, Math.round(y * ky - d / 2) - 1, d + 2, d + 2);
        mctx.fillStyle = col;
        mctx.fillRect(Math.round(x * kx - d / 2), Math.round(y * ky - d / 2), d, d);
      };
      for (const it of world.interacts) {
        const col =
          it.kind === "post"
            ? s.read.has(it.id)
              ? "#c9c9a6"
              : "#f6c453"
            : it.id === "subscribe"
              ? "#7180b1"
              : "#bd757e";
        dot(it.signX, it.signY - 8, col);
      }
      dot(s.x, s.y - 6, Math.floor(t * 3) % 2 ? "#ffffff" : "#e0503a");
    };
    resize();
    sizeMap();
    window.addEventListener("resize", resize);
    window.addEventListener("resize", sizeMap);

    const footBlocked = (x: number, y: number) => {
      const cw = cur();
      return (
        tileBlocked(cw, x - 4, y) ||
        tileBlocked(cw, x + 4, y) ||
        tileBlocked(cw, x - 4, y - 3) ||
        tileBlocked(cw, x + 4, y - 3)
      );
    };

    const drawTag = (text: string, sx: number, sy: number, hot: boolean) => {
      const u = s.dpr;
      ctx.font = `${Math.round(11 * u)}px ${family}`;
      const maxW = 150 * u;
      let t = text;
      while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -1);
      if (t !== text) t = `${t.trimEnd()}…`;
      const w = Math.round(ctx.measureText(t).width + 12 * u);
      const h = Math.round(18 * u);
      const x = Math.round(sx - w / 2);
      const y = Math.round(sy - h);
      const b = Math.max(2, Math.round(2 * u));
      ctx.fillStyle = hot ? "#f6c453" : "#7a4a22";
      ctx.fillRect(x - b, y - b, w + b * 2, h + b * 2);
      ctx.fillStyle = "#f2d5aa";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#3a2a18";
      ctx.textBaseline = "middle";
      ctx.fillText(t, x + 6 * u, y + h / 2 + 1);
    };

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      const W = cur();

      // ---- timelines: scene fades, sleeping, cooking ----
      let fadeA = 0;
      if (s.fade) {
        s.fade.t += dt;
        if (s.fade.phase === "out") {
          fadeA = Math.min(1, s.fade.t / s.fade.dur);
          if (s.fade.t >= s.fade.dur) {
            s.fade.cb();
            s.fade.phase = "in";
            s.fade.t = 0;
          }
        } else {
          fadeA = 1 - Math.min(1, s.fade.t / s.fade.dur);
          if (s.fade.t >= s.fade.dur) s.fade = null;
        }
      }
      let sleepA = 0;
      let sleepText = false;
      if (s.sleep) {
        const k = s.sleep;
        k.t += dt;
        if (k.t < 0.9) sleepA = k.t / 0.9;
        else if (k.t < 2.7) {
          sleepA = 1;
          sleepText = true;
          if (!k.flipped && k.t > 1.3) {
            k.flipped = true;
            s.night = !s.night;
          }
        } else if (k.t < 3.6) sleepA = 1 - (k.t - 2.7) / 0.9;
        else {
          s.sleep = null;
          act.current.toast(s.night ? "You slept until evening. Cozy..." : "Good morning!");
        }
      }
      if (s.cook >= 0) {
        s.cook += dt / 3.2;
        if (s.cook >= 1) {
          s.cook = -1;
          const [key, name] = DISHES[Math.floor(Math.random() * DISHES.length)];
          s.dish = key;
          s.dishName = name;
          act.current.toast(`You cooked ${name}! It is on the table.`);
        }
      }
      s.busy = !!s.fade || !!s.sleep || s.cook >= 0;

      // ---- update ----
      let vx = 0;
      let vy = 0;
      if (!s.target && s.route.length) s.route = [];
      if (!s.open && !s.busy) {
        const k = s.keys;
        vx = (k.has("arrowright") || k.has("d") ? 1 : 0) - (k.has("arrowleft") || k.has("a") ? 1 : 0);
        vy = (k.has("arrowdown") || k.has("s") ? 1 : 0) - (k.has("arrowup") || k.has("w") ? 1 : 0);
        vx += s.joy.x;
        vy += s.joy.y;
        if (vx !== 0 || vy !== 0) {
          s.target = null;
          const len = Math.hypot(vx, vy);
          if (len > 1) {
            vx /= len;
            vy /= len;
          }
        } else if (s.target) {
          const way = s.route.length ? s.route[0] : s.target;
          const dx = way.x - s.x;
          const dy = way.y - s.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= Math.max(2.5, SPEED * dt)) {
            if (s.route.length) {
              s.route.shift();
            } else {
              const arrive = s.target.arrive;
              s.target = null;
              if (arrive) act.current.activate(arrive);
            }
          } else {
            vx = dx / dist;
            vy = dy / dist;
          }
        }

        const ox = s.x;
        const oy = s.y;
        const nx = s.x + vx * SPEED * dt;
        if (!footBlocked(nx, s.y)) s.x = nx;
        const ny = s.y + vy * SPEED * dt;
        if (!footBlocked(s.x, ny)) s.y = ny;

        s.moving = Math.hypot(s.x - ox, s.y - oy) > 0.01;
        if (s.target && !s.moving) {
          s.stuck += dt;
          if (s.stuck > 0.5) s.target = null;
        } else s.stuck = 0;

        if (vx !== 0 || vy !== 0) {
          const a = Math.atan2(vy, vx);
          s.dir = (Math.round(a / (Math.PI / 4)) + 10) % 8;
        }
        if (s.moving) s.walkT += dt;

        let best: string | null = null;
        let bestD = NEAR;
        for (const it of W.interacts) {
          const d = Math.min(
            Math.hypot(s.x - it.spotX, s.y - it.spotY),
            Math.hypot(s.x - it.signX, s.y - it.signY),
          );
          if (d <= bestD) {
            bestD = d;
            best = it.id;
          }
        }
        if (best !== s.near) {
          s.near = best;
          setNearId(best);
        }
      } else {
        s.moving = false;
        if (s.busy && s.near) {
          s.near = null;
          setNearId(null);
        }
      }

      // ---- camera ----
      const S = s.S;
      const vw = canvas.width / S;
      const vh = canvas.height / S;
      s.camX = Math.round(
        W.w <= vw ? (W.w - vw) / 2 : clamp(s.x - vw / 2, 0, W.w - vw),
      );
      s.camY = Math.round(
        W.h <= vh ? (W.h - vh) / 2 : clamp(s.y - vh / 2, 0, W.h - vh),
      );

      // ---- draw ----
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = s.scene === "home" ? "#2a1b14" : "#1d3a1f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(S, 0, 0, S, -s.camX * S, -s.camY * S);

      const prow = s.moving ? [0, 1, 2, 1][Math.floor(s.walkT * 7) % 4] : 1;
      const paintPlayer = () => {
        const px = Math.round(s.x);
        const py = Math.round(s.y);
        ctx.fillStyle = "rgba(53,55,56,0.28)";
        ctx.fillRect(px - 5, py - 2, 10, 2);
        ctx.fillRect(px - 3, py - 3, 6, 1);
        ctx.drawImage(art.char, s.dir * 16, prow * 32, 16, 32, px - 8, py - 30, 16, 32);
      };
      const overlay = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const a = Math.max(fadeA, sleepA);
        if (a > 0) {
          ctx.fillStyle = `rgba(8,6,20,${a})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        if (sleepText) {
          ctx.font = `${Math.round(26 * s.dpr)}px ${family}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#f7ebaa";
          ctx.fillText(
            s.night ? "Zzz... sleeping until evening" : "Zzz... sleeping",
            canvas.width / 2,
            canvas.height / 2,
          );
          ctx.textAlign = "start";
        }
      };

      if (s.scene === "home") {
        const hs: HomeDrawState = {
          night: s.night,
          cook: s.cook,
          dish: s.dish,
          sleeping: !!s.sleep,
          heartT: s.heartT,
          x: s.x,
          y: s.y,
        };
        drawHomeScene(
          ctx,
          art,
          homeBg,
          W,
          hs,
          t,
          (hidden) => {
            if (!hidden) paintPlayer();
          },
          s.y,
        );

        // screen-space: cooking bar and the label of whatever you are at
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (s.cook >= 0) {
          const bx = (256 - s.camX - 18) * S;
          const by = (34 - s.camY) * S;
          ctx.fillStyle = "#7a4a22";
          ctx.fillRect(bx - 2 * S, by - 2 * S, 40 * S, 7 * S);
          ctx.fillStyle = "#3a2a18";
          ctx.fillRect(bx, by, 36 * S, 3 * S);
          ctx.fillStyle = "#f6c453";
          ctx.fillRect(bx, by, Math.round(36 * S * Math.min(1, s.cook)), 3 * S);
        }
        const nearIt = W.interacts.find((i) => i.id === s.near);
        if (nearIt && !s.busy) {
          drawTag(nearIt.label, (nearIt.signX - s.camX) * S, (nearIt.signY - 30 - s.camY) * S, true);
        }
        overlay();
        raf = requestAnimationFrame(frame);
        return;
      }

      const c0 = Math.max(0, Math.floor(s.camX / T));
      const c1 = Math.min(43, Math.floor((s.camX + vw) / T));
      const r0 = Math.max(0, Math.floor(s.camY / T));
      const r1 = Math.min(world.rows - 1, Math.floor((s.camY + vh) / T));
      const wf = Math.floor(t * 2.2) % 4;

      // base layer: dirt trail, water, and whatever shows under grass edges
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const i = r * 44 + c;
          const kd = world.kind[i];
          const px = c * T;
          const py = r * T;
          if (kd === 2 || (kd === 0 && ground.needBase[i] && ground.baseWater[i])) {
            ctx.drawImage(art.water, wf * 16, 0, 16, 16, px, py, 16, 16);
          } else if (kd === 1 || (kd === 0 && ground.needBase[i])) {
            const pb = kd === 1 && ground.pebbles[i];
            ctx.drawImage(art.dirt, pb ? 128 : 80, pb ? 128 : 16, 16, 16, px, py, 16, 16);
          }
        }
      }
      // grass layer on top (pre-rendered once)
      {
        const gx = Math.max(0, s.camX);
        const gy = Math.max(0, s.camY);
        const gw = Math.min(world.w - gx, Math.ceil(vw) + 1);
        const gh = Math.min(world.h - gy, Math.ceil(vh) + 1);
        if (gw > 0 && gh > 0)
          ctx.drawImage(ground.layer, gx, gy, gw, gh, gx, gy, gw, gh);
      }

      const spriteFor = (key: string, interact?: string) => {
        const k = interact && key === "sign0" && s.read.has(interact) ? "sign1" : key;
        const sp = art.sprites[k];
        return Array.isArray(sp) ? sp[Math.floor(t * 5) % sp.length] : sp;
      };
      const inView = (o: { x: number; y: number }) =>
        o.x > s.camX - 48 &&
        o.x < s.camX + vw + 48 &&
        o.y > s.camY - 8 &&
        o.y < s.camY + vh + 72;

      const vis = world.objects.filter(inView);
      for (const o of vis) {
        if (!o.flat) continue;
        const cv = spriteFor(o.key, o.interact);
        ctx.drawImage(cv, Math.round(o.x - cv.width / 2), Math.round(o.y - cv.height));
      }

      let playerDrawn = false;
      const drawPlayer = () => {
        paintPlayer();
        playerDrawn = true;
      };
      for (const o of vis) {
        if (o.flat) continue;
        if (!playerDrawn && o.y > s.y) drawPlayer();
        const cv = spriteFor(o.key, o.interact);
        ctx.drawImage(cv, Math.round(o.x - cv.width / 2), Math.round(o.y - cv.height));
      }
      if (!playerDrawn) drawPlayer();

      // "!" over unread posts
      const bob = Math.round(Math.sin(t * 4) * 1.5);
      for (const it of world.interacts) {
        if (it.kind !== "post" || s.read.has(it.id) || !inView({ x: it.signX, y: it.signY })) continue;
        ctx.drawImage(art.sprites.exclaim as HTMLCanvasElement, Math.round(it.signX - 4), Math.round(it.signY - 48 + bob));
      }

      // ---- screen-space labels ----
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const it of world.interacts) {
        if (!inView({ x: it.signX, y: it.signY })) continue;
        const lift = it.kind === "post" ? 36 : BIG.has(it.id) ? 70 : 34;
        const sx = (it.signX - s.camX) * S;
        const sy = (it.signY - lift - s.camY) * S;
        drawTag(it.label, sx, sy, it.id === s.near);
      }

      drawMap(t);
      overlay();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("resize", sizeMap);
    };
  }, [world, assets, scenes]);

  // Keyboard.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || g.current.open) return;
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(k)) {
        g.current.keys.add(k);
        if (k.startsWith("arrow")) e.preventDefault();
      } else if ((k === "enter" || k === "e" || k === " ") && g.current.near) {
        if (t?.tagName === "BUTTON" || t?.tagName === "A") return;
        e.preventDefault();
        act.current.activate(g.current.near);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      g.current.keys.delete(e.key.toLowerCase());
    };
    const onBlur = () => g.current.keys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // Click / tap: a sign or prop walks you there; open ground walks you to the point.
  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = g.current;
    if (s.open || s.busy) return;
    const cw = scenes[s.scene];
    const rect = e.currentTarget.getBoundingClientRect();
    const wx = s.camX + ((e.clientX - rect.left) * s.dpr) / s.S;
    const wy = s.camY + ((e.clientY - rect.top) * s.dpr) / s.S;
    for (const it of cw.interacts) {
      const big = BIG.has(it.id);
      const cy = it.signY - (it.hitDy ?? (big ? 30 : 14));
      if (Math.hypot(wx - it.signX, wy - cy) <= (it.hitR ?? (big ? 42 : 20))) {
        act.current.goTo(it.id);
        return;
      }
    }
    if (!tileBlocked(cw, wx, wy)) {
      s.target = { x: wx, y: wy, arrive: null };
      s.route = planRoute(cw, s.x, s.y, wx, wy) ?? [];
      s.stuck = 0;
    }
  };

  // Virtual joystick (touch screens).
  const joyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const max = rect.width / 2;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, len / max);
    const nx = (dx / len) * k;
    const ny = (dy / len) * k;
    g.current.joy = Math.hypot(nx, ny) < 0.2 ? { x: 0, y: 0 } : { x: nx, y: ny };
    if (knobRef.current)
      knobRef.current.style.transform = `translate(${nx * max * 0.6}px, ${ny * max * 0.6}px)`;
  };
  const joyEnd = () => {
    g.current.joy = { x: 0, y: 0 };
    if (knobRef.current) knobRef.current.style.transform = "translate(0,0)";
  };

  const nearIt = nearId ? scenes[scene].interacts.find((i) => i.id === nearId) : undefined;
  const isPost = openKey !== null && stops.some((s) => s.slug === openKey);
  const modalTitle =
    openKey === SUBSCRIBE
      ? "Subscribe"
      : openKey === ABOUT
        ? "About"
        : openKey === SONG
          ? "Song"
          : openKey === ADMIN
            ? "Admin"
            : (stops.find((s) => s.slug === openKey)?.title ?? "Post");

  return (
    <div className="g-root">
      <canvas
        ref={canvasRef}
        className="g-canvas"
        onClick={onCanvasClick}
        aria-label="Walk the trail to read the posts"
      />

      {!assets && <div className="g-loading">Loading the town…</div>}

      {toast && (
        <div className="g-toast" role="status">
          {toast}
        </div>
      )}

      <a
        className="g-credit"
        href="https://cupnooble.itch.io/sprout-lands-asset-pack"
        target="_blank"
        rel="noreferrer"
      >
        Art: Sprout Lands by Cup Nooble
      </a>

      <div className="g-title" aria-hidden="true">
        <strong>Sheza&apos;s Blogs</strong>
        <span>
          📜 {readCount} / {stops.length} read
        </span>
      </div>

      <nav className="g-nav" aria-label="Site">
        <Link
          href="/about"
          onClick={(e) => {
            e.preventDefault();
            openModal(ABOUT, PAGE_URL[ABOUT]);
          }}
        >
          About
        </Link>
        <Link
          href="/song"
          onClick={(e) => {
            e.preventDefault();
            openModal(SONG, PAGE_URL[SONG]);
          }}
        >
          Song
        </Link>
        <Link href="/?view=list">List</Link>
        <Link
          href="/admin"
          onClick={(e) => {
            e.preventDefault();
            openModal(ADMIN, PAGE_URL[ADMIN]);
          }}
        >
          Admin
        </Link>
      </nav>

      <canvas
        ref={mapRef}
        className={`g-map${scene === "home" ? " g-map-off" : ""}`}
        aria-hidden="true"
      />

      {(() => {
        const open = helpPref ?? !touch;
        return (
          <aside className={`g-help${touch ? " g-help-touch" : ""}`}>
            <button
              type="button"
              className="g-help-toggle"
              aria-expanded={open}
              onClick={() => setHelpPref(!open)}
            >
              {open ? "✕" : "?"} <span>How to play</span>
            </button>
            {open && (
              <ul>
                {touch ? (
                  <>
                    <li>🕹️ Hold the stick to walk</li>
                    <li>👆 Tap a sign or house to go there</li>
                    <li>📜 Tap the button to open it</li>
                  </>
                ) : (
                  <>
                    <li>⌨️ WASD / arrows to walk</li>
                    <li>↵ Enter or E to open a sign</li>
                    <li>🖱️ Click to walk or pick a sign</li>
                  </>
                )}
                <li>🏘️ Town: About · Home · Admin · Jukebox</li>
                <li>🏠 Home: cook, eat, pet the cat, sleep</li>
                <li>🪧 Each sign down the trail is a post</li>
                <li>🗺️ The map shows where you are</li>
              </ul>
            )}
          </aside>
        );
      })()}

      {nearIt && !openKey && (
        <button
          type="button"
          className="g-prompt"
          onClick={() => activate(nearIt.id)}
        >
          {nearIt.verb} {!touch && <kbd>Enter</kbd>}
        </button>
      )}

      {touch && !openKey && (
        <div
          className="g-joy"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            joyMove(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons || e.pointerType === "touch") joyMove(e);
          }}
          onPointerUp={joyEnd}
          onPointerCancel={joyEnd}
        >
          <div ref={knobRef} className="g-joy-knob" />
        </div>
      )}

      {/* Plain links so crawlers and keyboard / screen-reader users can reach
          every post without playing. */}
      <nav className="sr-only" aria-label="All posts">
        <ul>
          {stops.map((s) => (
            <li key={s.slug}>
              <Link href={`/blog/${s.slug}`}>{s.title}</Link>
            </li>
          ))}
        </ul>
      </nav>

      {openKey && (
        <PostModal title={modalTitle} onClose={closeModal} readers={isPost}>
          {nodes[openKey]}
        </PostModal>
      )}
    </div>
  );
}
