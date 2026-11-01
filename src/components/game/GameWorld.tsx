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
import { mulberry32 } from "@/components/game/rng";
import { loadArt, type Art } from "@/components/game/art";
import { buildGround, type Ground } from "@/components/game/ground";
import {
  buildHome,
  buildHomeBg,
  drawHomeScene,
  type HomeDrawState,
} from "@/components/game/home";
import {
  DEFAULT_CHOICE,
  FARMER_TINTS,
  FOX_CHOICE,
  HEAD_TOP,
  OWNER_CHOICE,
  isKind,
  labelOf,
  VISITOR_CHARS,
  type CharKind,
  type Choice,
} from "@/components/game/characters";
import {
  cleanMessage,
  cleanName,
  MAX_MESSAGE,
  MAX_NAME,
  messageProblem,
  nameProblem,
} from "@/components/game/names";
import {
  ACTION_SECONDS,
  connectMultiplayer,
  randomName,
  type Multiplayer,
} from "@/components/game/multiplayer";
import {
  buildWorld,
  footFree,
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
type Role = "visitor" | "owner" | "super";

// Quick emotes (keys 1-4), more in the panel, and body actions (keys 5-7).
const QUICK = ["👋", "❤", "♪", "💤"];
const MORE_EMOJI = [
  ...QUICK,
  "😂", "😮", "😢", "😡", "😍", "😎", "👍", "👎", "🎉", "✨",
  "❓", "❗", "🔥", "🌸", "🍪", "☕", "🌙", "⭐", "🎵", "💭",
];
const ACTIONS: { k: string; icon: string; label: string }[] = [
  { k: "!dance", icon: "💃", label: "Dance" },
  { k: "!jump", icon: "🦘", label: "Jump" },
  { k: "!spin", icon: "🔄", label: "Spin" },
];
const CHAR_KEY = "trail-character";
const OWNER_CHAR_KEY = "trail-owner-character";

// The picture of a character on the entry screen (front-facing, standing).
function CharPreview({ art, kind, tint }: { art: Art | null; kind: CharKind; tint: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c || !art) return;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 16, 32);
    const sheet = art.chars[kind]?.[tint] ?? art.chars[kind]?.[0];
    if (sheet) c.drawImage(sheet, 4 * 16, 32, 16, 32, 0, 0, 16, 32);
  }, [art, kind, tint]);
  return <canvas ref={ref} width={16} height={32} className="g-char-prev" aria-hidden="true" />;
}

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
  initialPage?: "about" | "song";
}) {
  const router = useRouter();
  // Who is playing. Owner (Sheza) and superadmin (Fox) can use the Admin house;
  // visitors never see it.
  const [role, setRole] = useState<Role>("visitor");
  const admin = role === "super";
  const owner = role === "owner";
  const canAdmin = role !== "visitor";
  const world = useMemo(() => buildWorld(stops, canAdmin), [stops, canAdmin]);
  const home = useMemo(() => buildHome(), []);
  const scenes = useMemo(() => ({ out: world, home }), [world, home]);

  const initialInteract = initialSlug
    ? world.interacts.find((i) => i.slug === initialSlug)
    : undefined;

  // The entry screen always asks who you are, except on a direct link to a
  // post or page. Superadmin powers come only from typing the password here,
  // never from an old admin cookie.
  const gateInitial = !(initialSlug || initialPage);
  const [gate, setGate] = useState(gateInitial);
  const [gateMode, setGateMode] = useState<"choose" | "pick" | "owner" | "super" | "ownerPick">("choose");
  const [choice, setChoice] = useState<Choice>(DEFAULT_CHOICE);
  const [ownerChoice, setOwnerChoice] = useState<Choice>(OWNER_CHOICE);
  const [nameInput, setNameInput] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [gateErr, setGateErr] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);
  const [relogin, setRelogin] = useState(false); // opened later from the game, not at the start
  const [online, setOnline] = useState(1);
  const [mpOn, setMpOn] = useState(false);
  const [flyUi, setFlyUi] = useState(false);
  const [boostUi, setBoostUi] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const chatRef = useRef<HTMLInputElement>(null);
  const mpRef = useRef<Multiplayer | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const [helpPref, setHelpPref] = useState<boolean | null>(null);
  const [navPref, setNavPref] = useState<boolean | null>(null);
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
    open: openKey !== null || gateInitial,
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
    // multiplayer / superadmin
    admin: false,
    owner: false,
    fly: false,
    boost: false,
    me: { name: "Visitor", kind: "farmer" as CharKind, tint: 1 },
    myEmote: { k: "", at: -99999 },
    myAct: { k: "", at: -99999 },
    mySay: { text: "", at: -99999 },
    lastSay: -99999,
    choice: DEFAULT_CHOICE as Choice,
    ownerChoice: OWNER_CHOICE as Choice,
    chosenName: "",
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

  // Remember the last character picked on this device.
  const restoreChoice = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAR_KEY) ?? "null");
      if (saved && isKind(saved.kind) && saved.kind !== "fox") {
        setChoice({
          kind: saved.kind,
          tint: Math.abs(Number(saved.tint) || 0) % FARMER_TINTS,
        });
        if (typeof saved.name === "string") setNameInput(cleanName(saved.name));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const startAsVisitor = () => {
    const name = cleanName(nameInput);
    const problem = nameProblem(name);
    if (problem) {
      setNameErr(problem);
      return;
    }
    try {
      localStorage.setItem(CHAR_KEY, JSON.stringify({ ...choice, name }));
    } catch {
      /* ignore */
    }
    g.current.choice = choice;
    g.current.chosenName = name;
    dismissGate();
  };

  const startAsOwner = () => {
    try {
      localStorage.setItem(OWNER_CHAR_KEY, JSON.stringify(ownerChoice));
    } catch {
      /* ignore */
    }
    g.current.ownerChoice = ownerChoice;
    dismissGate();
  };

  const dismissGate = useCallback(() => {
    setGate(false);
    setRelogin(false);
    g.current.open = false;
  }, []);

  // A visitor who is already playing can still sign in as Sheza or the superadmin.
  const openLogin = useCallback(() => {
    setRelogin(true);
    setGateMode("choose");
    setGateErr(null);
    setPw("");
    setEmoteOpen(false);
    setChatOpen(false);
    g.current.target = null;
    g.current.keys.clear();
    g.current.open = true;
    setGate(true);
  }, []);

  useEffect(() => {
    g.current.admin = admin;
    g.current.owner = owner;
    if (!admin) {
      g.current.fly = false;
      g.current.boost = false;
    }
  }, [admin, owner]);

  // Join the shared town once through the entry screen.
  useEffect(() => {
    if (gate) return;
    const pick = admin ? FOX_CHOICE : owner ? g.current.ownerChoice : g.current.choice;
    const name = admin
      ? "Fox"
      : owner
        ? "Sheza"
        : g.current.chosenName || randomName(labelOf(pick.kind));
    g.current.me = { name, kind: pick.kind, tint: pick.tint };
    const mp = connectMultiplayer({
      id: crypto.randomUUID(),
      name,
      kind: pick.kind,
      tint: pick.tint,
      role: admin ? "super" : owner ? "owner" : "visitor",
      onCount: (n) => {
        setOnline(n);
        setMpOn(true);
      },
    });
    mpRef.current = mp;
    return () => {
      mp.close();
      mpRef.current = null;
      setMpOn(false);
    };
  }, [gate, admin, owner]);

  const unstick = useCallback(() => {
    const s = g.current;
    const cw = scenes[s.scene];
    if (footFree(cw, s.x, s.y)) return;
    for (let r = 4; r <= 96; r += 4)
      for (let a = 0; a < 16; a++) {
        const x = s.x + Math.cos((a / 16) * Math.PI * 2) * r;
        const y = s.y + Math.sin((a / 16) * Math.PI * 2) * r;
        if (footFree(cw, x, y)) {
          s.x = x;
          s.y = y;
          return;
        }
      }
  }, [scenes]);

  const toggleFly = useCallback(() => {
    const s = g.current;
    if (!s.admin) return;
    s.fly = !s.fly;
    s.target = null;
    s.route = [];
    if (!s.fly) unstick();
    setFlyUi(s.fly);
  }, [unstick]);

  const toggleBoost = useCallback(() => {
    const s = g.current;
    if (!s.admin) return;
    s.boost = !s.boost;
    setBoostUi(s.boost);
  }, []);

  // An emoji bubble ("😂") or a body action ("!dance").
  const sendEmote = useCallback((k: string) => {
    if (!k) return;
    if (k.startsWith("!")) {
      if (!ACTION_SECONDS[k]) return;
      g.current.myAct = { k, at: performance.now() };
    } else {
      g.current.myEmote = { k, at: performance.now() };
    }
    mpRef.current?.emote(k);
  }, []);

  // A typed message: shown above your head and sent to everyone online.
  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const s = g.current;
    const text = cleanMessage(chatText);
    const problem = messageProblem(text);
    if (problem) {
      showToast(problem);
      return;
    }
    if (performance.now() - s.lastSay < 1500) {
      showToast("Slow down a little.");
      return;
    }
    s.lastSay = performance.now();
    s.mySay = { text, at: performance.now() };
    mpRef.current?.say(text);
    setChatText("");
    if (touch) setChatOpen(false);
  };

  // Press T to start typing.
  useEffect(() => {
    if (chatOpen) chatRef.current?.focus();
  }, [chatOpen]);

  const adminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateBusy(true);
    setGateErr(null);
    try {
      const res = await fetch(gateMode === "super" ? "/api/auth/superadmin" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        setGateErr(
          res.status === 401
            ? "That password is not right."
            : res.status === 429
              ? "Too many tries. Please wait a few minutes."
              : res.status === 503
                ? "This login is not set up yet."
                : "Could not log in. Try again.",
        );
      } else {
        setPw("");
        setFlyUi(false);
        setBoostUi(false);
        if (gateMode === "super") {
          setRole("super");
          dismissGate();
        } else {
          // Sheza picks how she looks before walking in
          try {
            const saved = JSON.parse(localStorage.getItem(OWNER_CHAR_KEY) ?? "null");
            if (saved && (saved.kind === "farmer" || saved.kind === "bear")) {
              setOwnerChoice({
                kind: saved.kind,
                tint: saved.kind === "farmer" ? Math.abs(Number(saved.tint) || 0) % 3 : 0,
              });
            }
          } catch {
            /* ignore */
          }
          setRole("owner");
          setGateMode("ownerPick");
        }
      }
    } catch {
      setGateErr("Could not reach the server.");
    } finally {
      setGateBusy(false);
    }
  };

  const adminLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    const s = g.current;
    s.fly = false;
    s.boost = false;
    setFlyUi(false);
    setBoostUi(false);
    unstick();
    setRole("visitor");
    showToast("Logged out. You are a visitor again.");
  };

  // Superadmin: click the minimap to teleport.
  const teleport = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = g.current;
    if (!s.admin || s.scene !== "out" || s.open) return;
    const rect = e.currentTarget.getBoundingClientRect();
    s.x = ((e.clientX - rect.left) / rect.width) * world.w;
    s.y = ((e.clientY - rect.top) / rect.height) * world.h;
    s.target = null;
    s.route = [];
    unstick();
  };

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
  const openChat = useCallback(() => setChatOpen(true), []);
  const act = useRef({
    activate,
    goTo,
    toast: showToast,
    fly: toggleFly,
    emote: sendEmote,
    chat: openChat,
  });
  useEffect(() => {
    act.current = {
      activate,
      goTo,
      toast: showToast,
      fly: toggleFly,
      emote: sendEmote,
      chat: openChat,
    };
  }, [activate, goTo, showToast, toggleFly, sendEmote, openChat]);

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
    // Fireflies: a few hundred hover over the grass, drifting and blinking.
    const flies: { x: number; y: number; p: number }[] = [];
    {
      const rnd = mulberry32(0xf1f1e5);
      for (let tries = 0; flies.length < 650 && tries < 10000; tries++) {
        const c = Math.floor(rnd() * world.cols);
        const r = Math.floor(rnd() * world.rows);
        if (world.kind[r * world.cols + c] !== 0) continue;
        flies.push({ x: c * T + rnd() * T, y: r * T + rnd() * T, p: rnd() * Math.PI * 2 });
      }
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
        // superadmin: flying is faster and ignores obstacles; boost is faster still
        const sp =
          SPEED *
          (s.fly ? 1.7 : 1) *
          (s.admin && (s.boost || s.keys.has("shift")) ? 1.8 : 1);
        const nx = s.x + vx * sp * dt;
        const ny = s.y + vy * sp * dt;
        if (s.fly) {
          const inHome = s.scene === "home";
          s.x = clamp(nx, 24, inHome ? 296 : W.w - 24);
          s.y = clamp(ny, inHome ? 72 : 24, inHome ? 214 : W.h - 10);
        } else {
          if (!footBlocked(nx, s.y)) s.x = nx;
          if (!footBlocked(s.x, ny)) s.y = ny;
        }

        s.moving = Math.hypot(s.x - ox, s.y - oy) > 0.01;
        if (s.target && !s.moving) {
          s.stuck += dt;
          if (s.stuck > 0.5) s.target = null;
        } else s.stuck = 0;

        if (vx !== 0 || vy !== 0) {
          const a = Math.atan2(vy, vx);
          s.dir = (Math.round(a / (Math.PI / 4)) + 10) % 8;
        }
        if (s.moving) {
          s.walkT += dt;
          s.myAct.k = "";
        }

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

      // ---- other visitors ----
      const mp = mpRef.current;
      if (mp) {
        mp.update(dt);
        mp.send({
          x: s.x,
          y: s.y,
          dir: s.dir,
          moving: s.moving,
          fly: s.fly,
          scene: s.scene,
        });
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

      const flyLift = (fly: boolean) => (fly ? 11 + Math.sin(t * 5) * 1.5 : 0);
      const paintActor = (
        x: number,
        y: number,
        dir: number,
        moving: boolean,
        walkT: number,
        kind: CharKind,
        tint: number,
        fly: boolean,
        isSuper: boolean,
        isOwner: boolean,
        action = "",
        actAge = 0,
      ) => {
        const px = Math.round(x);
        const py = Math.round(y);
        // body actions change the facing, the step frame and the height
        let faceDir = dir;
        let row = moving ? [0, 1, 2, 1][Math.floor(walkT * 7) % 4] : 1;
        let hop = 0;
        if (action === "!dance") {
          faceDir = [4, 5, 4, 3][Math.floor(actAge * 4) % 4];
          row = [0, 2][Math.floor(actAge * 8) % 2];
          hop = Math.abs(Math.sin(actAge * 8)) * 3;
        } else if (action === "!jump") {
          hop = Math.sin(Math.min(1, actAge / 0.7) * Math.PI) * 12;
          row = 1;
        } else if (action === "!spin") {
          faceDir = [4, 5, 6, 7, 0, 1, 2, 3][Math.floor(actAge * 14) % 8];
          row = 1;
        }
        const lift = Math.round(flyLift(fly) + hop);
        const head = py - 30 + HEAD_TOP[kind] - lift; // y of the top of the head
        ctx.fillStyle = fly ? "rgba(53,55,56,0.2)" : "rgba(53,55,56,0.28)";
        ctx.fillRect(px - 5, py - 2, 10, 2);
        ctx.fillRect(px - 3, py - 3, 6, 1);
        if (isSuper && fly) {
          const fw = Math.sin(t * 14) > 0 ? 6 : 4;
          ctx.fillStyle = "#fff9d6";
          ctx.fillRect(px - 7 - fw, head + 9, fw, 4);
          ctx.fillRect(px + 7, head + 9, fw, 4);
          ctx.fillStyle = "#e8c97a";
          ctx.fillRect(px - 7 - fw, head + 13, fw - 1, 1);
          ctx.fillRect(px + 7, head + 13, fw - 1, 1);
        }
        ctx.drawImage(
          art.chars[kind]?.[tint] ?? art.chars[kind]?.[0] ?? art.char,
          faceDir * 16,
          row * 32,
          16,
          32,
          px - 8,
          py - 30 - lift,
          16,
          32,
        );
        if (isOwner) {
          // Sheza wears a little flower crown
          const crown = ["#f29ab6", "#f6c453", "#f29ab6", "#f6c453", "#f29ab6"];
          crown.forEach((col, i) => {
            ctx.fillStyle = col;
            ctx.fillRect(px - 5 + i * 2, head - 1, 2, 2);
          });
          ctx.fillStyle = "#78a158";
          ctx.fillRect(px - 6, head, 1, 1);
          ctx.fillRect(px + 5, head, 1, 1);
        }
        if (isSuper) {
          ctx.fillStyle = "#f6c453";
          ctx.fillRect(px - 3, head - 5, 6, 1);
          ctx.fillRect(px - 4, head - 4, 1, 1);
          ctx.fillRect(px + 3, head - 4, 1, 1);
          ctx.fillRect(px - 3, head - 3, 6, 1);
        }
        if (isSuper && fly) {
          for (let i = 0; i < 4; i++) {
            const age = (t * 18 + i * 6) % 14;
            ctx.fillStyle = `rgba(255,224,120,${1 - age / 14})`;
            ctx.fillRect(
              Math.round(px + Math.sin(t * 3 + i * 1.9) * 7),
              Math.round(py - lift + 2 + age),
              1 + (i % 2),
              1 + (i % 2),
            );
          }
        }
      };

      // everyone standing in this scene, back to front (fliers on top)
      const myKind: CharKind = s.admin ? "fox" : s.me.kind;
      const myTint = s.admin ? 0 : s.me.tint;
      const actors: { y: number; draw: () => void }[] = [];
      if (!(s.scene === "home" && s.sleep)) {
        actors.push({
          y: s.fly ? 1e9 : s.y,
          draw: () => {
            const ageMs = performance.now() - s.myAct.at;
            const live = s.myAct.k && ageMs < (ACTION_SECONDS[s.myAct.k] ?? 0) * 1000;
            paintActor(
              s.x,
              s.y,
              s.dir,
              s.moving,
              s.walkT,
              myKind,
              myTint,
              s.fly,
              s.admin,
              s.owner,
              live ? s.myAct.k : "",
              ageMs / 1000,
            );
          },
        });
      }
      for (const r of mpRef.current?.remotes.values() ?? []) {
        if (r.scene !== s.scene) continue;
        actors.push({
          y: r.fly ? 1e9 : r.y,
          draw: () =>
            paintActor(
              r.x,
              r.y,
              r.dir,
              r.moving,
              r.walkT,
              r.admin ? "fox" : isKind(r.kind) ? r.kind : "farmer",
              r.admin ? 0 : r.tint,
              r.fly,
              r.admin,
              r.owner,
              r.act && Date.now() - r.actAt < (ACTION_SECONDS[r.act] ?? 0) * 1000 ? r.act : "",
              (Date.now() - r.actAt) / 1000,
            ),
        });
      }
      actors.sort((a, b) => a.y - b.y);

      const drawBubble = (text: string, sx: number, sy: number) => {
        const u = s.dpr;
        ctx.font = `${Math.round(15 * u)}px sans-serif`;
        const w = Math.round(ctx.measureText(text).width + 12 * u);
        const h = Math.round(22 * u);
        const x = Math.round(sx - w / 2);
        const y = Math.round(sy - h);
        ctx.fillStyle = "#3a2a18";
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        ctx.fillStyle = "#fffbea";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#3a2a18";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + 6 * u, y + h / 2 + 1);
      };
      // a speech bubble with the words wrapped (up to three lines)
      const drawSpeech = (text: string, sx: number, sy: number) => {
        const u = s.dpr;
        ctx.font = `${Math.round(13 * u)}px sans-serif`;
        const maxW = 170 * u;
        const lines: string[] = [];
        let line = "";
        for (const word of text.split(" ")) {
          const next = line ? `${line} ${word}` : word;
          if (line && ctx.measureText(next).width > maxW) {
            lines.push(line);
            line = word;
          } else line = next;
        }
        if (line) lines.push(line);
        const shown = lines.slice(0, 3);
        const w = Math.round(Math.max(...shown.map((l) => ctx.measureText(l).width)) + 14 * u);
        const lh = Math.round(16 * u);
        const h = shown.length * lh + Math.round(8 * u);
        const x = Math.round(sx - w / 2);
        const y = Math.round(sy - h);
        ctx.fillStyle = "#3a2a18";
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        ctx.fillStyle = "#fffbea";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#3a2a18";
        ctx.textBaseline = "middle";
        shown.forEach((l, i) => ctx.fillText(l, x + 7 * u, y + Math.round(4 * u) + lh * i + lh / 2));
        return h;
      };
      const sayLive = (at: number, nowMs: number, text: string) =>
        nowMs - at < 5000 + text.length * 60;
      // names and emote bubbles, in screen space
      const drawPeople = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const onScreen = (sx: number, sy: number) =>
          sx > -80 && sx < canvas.width + 80 && sy > -80 && sy < canvas.height + 120;
        const nowMs = Date.now();
        for (const r of mpRef.current?.remotes.values() ?? []) {
          if (r.scene !== s.scene) continue;
          const sx = (r.x - s.camX) * S;
          const rk: CharKind = r.admin ? "fox" : isKind(r.kind) ? r.kind : "farmer";
          const sy = (r.y - 30 + HEAD_TOP[rk] - 14 - flyLift(r.fly) - s.camY) * S;
          if (!onScreen(sx, sy)) continue;
          drawTag(r.admin ? "★ Fox" : r.owner ? "♥ Sheza" : r.name, sx, sy, r.admin || r.owner);
          let up = sy - 22 * s.dpr;
          if (r.say && sayLive(r.sayAt, nowMs, r.say)) up -= drawSpeech(r.say, sx, up) + 6 * s.dpr;
          if (r.emote && nowMs - r.emoteAt < 2600) drawBubble(r.emote, sx, up);
        }
        if (s.myEmote.k && performance.now() - s.myEmote.at < 2600) {
          const sx = (s.x - s.camX) * S;
          const sy = (s.y - 30 + HEAD_TOP[myKind] - 14 - flyLift(s.fly) - s.camY) * S;
          drawBubble(s.myEmote.k, sx, s.mySay.text && sayLive(s.mySay.at, performance.now(), s.mySay.text) ? sy - 50 * s.dpr : sy);
        }
        if (s.mySay.text && sayLive(s.mySay.at, performance.now(), s.mySay.text)) {
          const sx = (s.x - s.camX) * S;
          const sy = (s.y - 30 + HEAD_TOP[myKind] - 14 - flyLift(s.fly) - s.camY) * S;
          drawSpeech(s.mySay.text, sx, sy);
        }
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
          actors,
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
        drawPeople();
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

      let ai = 0;
      for (const o of vis) {
        if (o.flat) continue;
        while (ai < actors.length && o.y > actors[ai].y) actors[ai++].draw();
        const cv = spriteFor(o.key, o.interact);
        ctx.drawImage(cv, Math.round(o.x - cv.width / 2), Math.round(o.y - cv.height));
      }
      while (ai < actors.length) actors[ai++].draw();

      // fireflies over the grass (only the ones on screen)
      for (const f of flies) {
        if (f.x < s.camX - 12 || f.x > s.camX + vw + 12 || f.y < s.camY - 12 || f.y > s.camY + vh + 12) continue;
        const a = Math.max(0, Math.sin(t * 1.7 + f.p * 3));
        const glow = 0.25 + 0.75 * a * a;
        const fx = Math.round(f.x + Math.sin(t * 0.6 + f.p) * 9);
        const fy = Math.round(f.y + Math.cos(t * 0.8 + f.p * 1.3) * 6 - 6);
        ctx.fillStyle = `rgba(255,170,40,${0.2 * glow})`;
        ctx.fillRect(fx - 3, fy - 3, 7, 7);
        ctx.fillStyle = `rgba(255,190,50,${0.5 * glow})`;
        ctx.fillRect(fx - 1, fy - 2, 3, 5);
        ctx.fillRect(fx - 2, fy - 1, 5, 3);
        ctx.fillStyle = `rgba(255,250,170,${0.5 + 0.5 * glow})`;
        ctx.fillRect(fx - 1, fy - 1, 2, 2);
      }

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

      drawPeople();
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
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s", "shift"].includes(k)) {
        g.current.keys.add(k);
        if (k.startsWith("arrow")) e.preventDefault();
      } else if (k === "f" && g.current.admin) {
        act.current.fly();
      } else if (k === "t") {
        e.preventDefault();
        act.current.chat();
      } else if (["1", "2", "3", "4", "5", "6", "7"].includes(k)) {
        const n = Number(k) - 1;
        act.current.emote(n < 4 ? QUICK[n] : ACTIONS[n - 4].k);
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
    if (s.fly || !tileBlocked(cw, wx, wy)) {
      s.target = { x: wx, y: wy, arrive: null };
      s.route = s.fly ? [] : (planRoute(cw, s.x, s.y, wx, wy) ?? []);
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
        {mpOn && <span>👥 {online === 1 ? "just you" : `${online} online`}</span>}
        {admin && <span>👑 Fox (superadmin)</span>}
        {owner && <span>🌸 Sheza (owner)</span>}
      </div>

      <nav className={`g-nav${navPref ?? false ? "" : " g-nav-min"}`} aria-label="Site">
        {(navPref ?? false) && (
          <>
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
        {canAdmin && (
          <Link
          href="/admin"
          onClick={(e) => {
            e.preventDefault();
            openModal(ADMIN, PAGE_URL[ADMIN]);
          }}
        >
          Admin
        </Link>
        )}
                </>
        )}
        {!canAdmin && (navPref ?? false) && (
          <button type="button" className="g-nav-toggle" onClick={openLogin}>
            Log in
          </button>
        )}
        <button
          type="button"
          className="g-nav-toggle"
          aria-expanded={navPref ?? false}
          aria-label={(navPref ?? false) ? "Minimize menu" : "Open menu"}
          title={(navPref ?? false) ? "Minimize menu" : "Open menu"}
          onClick={() => setNavPref(!(navPref ?? false))}
        >
          {(navPref ?? false) ? "–" : "☰ Menu"}
        </button>
      </nav>

      <canvas
        ref={mapRef}
        className={`g-map${scene === "home" ? " g-map-off" : ""}${admin ? " g-map-tp" : ""}`}
        aria-hidden="true"
        onClick={teleport}
        title={admin ? "Click to teleport" : undefined}
      />

      {!gate && (
        <div className={`g-bar${touch ? " g-bar-touch" : ""}`}>
          <button
            type="button"
            className={`g-emote g-more${chatOpen ? " on" : ""}`}
            onClick={() => setChatOpen((o) => !o)}
            aria-expanded={chatOpen}
            aria-label="Chat"
            title="Chat (T)"
          >
            💬
          </button>
          <button
            type="button"
            className={`g-emote g-more${emoteOpen ? " on" : ""}`}
            onClick={() => setEmoteOpen((o) => !o)}
            aria-expanded={emoteOpen}
            aria-label="More emotes and actions"
            title="More emotes and actions"
          >
            {emoteOpen ? "✕" : "😊"}
          </button>
          {chatOpen && (
            <form className="g-chat" onSubmit={sendChat}>
              <input
                ref={chatRef}
                type="text"
                value={chatText}
                maxLength={MAX_MESSAGE}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setChatOpen(false);
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Say something nice…"
                aria-label="Chat message"
                autoComplete="off"
                enterKeyHint="send"
              />
              <button type="submit" className="g-chat-send" disabled={!chatText.trim()}>
                Send
              </button>
            </form>
          )}
          {emoteOpen && (
            <div className="g-emote-panel" role="group" aria-label="More emotes and actions">
              <div className="g-emote-grid">
                {MORE_EMOJI.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="g-emote"
                    onClick={() => {
                      sendEmote(k);
                      setEmoteOpen(false);
                    }}
                    aria-label={`Emote ${k}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="g-action-row">
                {ACTIONS.map((a, i) => (
                  <button
                    key={a.k}
                    type="button"
                    className="g-action"
                    onClick={() => {
                      sendEmote(a.k);
                      setEmoteOpen(false);
                    }}
                    title={`${a.label} (${i + 5})`}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {admin && (
            <>
              <button
                type="button"
                className={`g-emote g-super${flyUi ? " on" : ""}`}
                onClick={toggleFly}
                aria-pressed={flyUi}
                title="Fly (F)"
              >
                🕊️
              </button>
              <button
                type="button"
                className={`g-emote g-super${boostUi ? " on" : ""}`}
                onClick={toggleBoost}
                aria-pressed={boostUi}
                title="Speed boost (hold Shift)"
              >
                ⚡
              </button>
            </>
          )}
          {!canAdmin && (
            <button
              type="button"
              className="g-emote"
              onClick={openLogin}
              title="Log in as Sheza or superadmin"
              aria-label="Log in as Sheza or superadmin"
            >
              🔑
            </button>
          )}
          {canAdmin && (
            <button
              type="button"
              className="g-emote g-super"
              onClick={adminLogout}
              title="Log out"
              aria-label="Log out"
            >
              🚪
            </button>
          )}
        </div>
      )}

      {gate && (
        <div className="g-gate" role="dialog" aria-modal="true" aria-label="Welcome">
          <div className="g-gate-card">
            <p className="g-gate-kicker">the writings of</p>
            <h1 className="g-gate-title">Sheza&apos;s Town</h1>
            <p className="g-gate-sub">A little retro space where thoughts walk around. Come on in.</p>
            {gateMode === "ownerPick" ? (
              <form
                className="g-pick"
                onSubmit={(e) => {
                  e.preventDefault();
                  startAsOwner();
                }}
              >
                <p className="g-pick-title">Welcome, Sheza! Choose your character</p>
                <div className="g-pick-grid g-pick-two" role="radiogroup" aria-label="Character">
                  {(["farmer", "bear"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={ownerChoice.kind === k}
                      className={`g-pick-card${ownerChoice.kind === k ? " on" : ""}`}
                      onClick={() =>
                        setOwnerChoice({ kind: k, tint: k === "farmer" ? ownerChoice.tint : 0 })
                      }
                    >
                      <CharPreview
                        art={assets?.art ?? null}
                        kind={k}
                        tint={k === "farmer" ? ownerChoice.tint : 0}
                      />
                      <span>{k === "farmer" ? "Farmer" : "Bear"}</span>
                    </button>
                  ))}
                </div>
                {ownerChoice.kind === "farmer" && (
                  <div className="g-pick-tints" role="radiogroup" aria-label="Shirt colour">
                    {[2, 0, 1].map((i) => (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={ownerChoice.tint === i}
                        aria-label={["Yellow", "Sky blue", "Pink"][i] + " shirt"}
                        className={`g-tint t${i}${ownerChoice.tint === i ? " on" : ""}`}
                        onClick={() => setOwnerChoice({ kind: "farmer", tint: i })}
                      />
                    ))}
                  </div>
                )}
                <div className="g-gate-btns">
                  <button type="submit" className="g-gate-btn g-gate-primary" disabled={!assets}>
                    {assets ? "▶ Let's go" : "Loading…"}
                  </button>
                </div>
              </form>
            ) : gateMode === "pick" ? (
              <form
                className="g-pick"
                onSubmit={(e) => {
                  e.preventDefault();
                  startAsVisitor();
                }}
              >
                <p className="g-pick-title">Choose your character</p>
                <div className="g-pick-grid" role="radiogroup" aria-label="Character">
                  {VISITOR_CHARS.map((c) => (
                    <button
                      key={c.kind}
                      type="button"
                      role="radio"
                      aria-checked={choice.kind === c.kind}
                      className={`g-pick-card${choice.kind === c.kind ? " on" : ""}`}
                      onClick={() =>
                        setChoice({ kind: c.kind, tint: c.kind === "farmer" ? choice.tint : 0 })
                      }
                    >
                      <CharPreview
                        art={assets?.art ?? null}
                        kind={c.kind}
                        tint={c.kind === "farmer" ? choice.tint : 0}
                      />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
                {choice.kind === "farmer" && (
                  <div className="g-pick-tints" role="radiogroup" aria-label="Shirt colour">
                    {Array.from({ length: FARMER_TINTS }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={choice.tint === i}
                        aria-label={`Shirt colour ${i + 1}`}
                        className={`g-tint t${i}${choice.tint === i ? " on" : ""}`}
                        onClick={() => setChoice({ kind: "farmer", tint: i })}
                      />
                    ))}
                  </div>
                )}
                <label className="g-name-label" htmlFor="g-name">
                  Your name <span>(optional)</span>
                </label>
                <input
                  id="g-name"
                  className="g-name"
                  type="text"
                  value={nameInput}
                  maxLength={MAX_NAME}
                  placeholder="Pick a name, or get a random one"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setNameErr(null);
                  }}
                />
                {nameErr && <p className="g-gate-err">{nameErr}</p>}
                <div className="g-gate-btns">
                  <button
                    type="submit"
                    className="g-gate-btn g-gate-primary"
                    disabled={!assets}
                  >
                    {assets ? "▶ Let's go" : "Loading…"}
                  </button>
                  <button type="button" className="g-gate-btn" onClick={() => setGateMode("choose")}>
                    Back
                  </button>
                </div>
              </form>
            ) : gateMode === "choose" ? (
              <div className="g-gate-btns">
                {!relogin && (
                  <button
                    type="button"
                    className="g-gate-btn g-gate-primary"
                    onClick={() => {
                      restoreChoice();
                      setGateMode("pick");
                    }}
                  >
                    🌱 Enter as Visitor
                  </button>
                )}
                <button type="button" className="g-gate-btn" onClick={() => setGateMode("owner")}>
                  🌸 Owner (Sheza)
                </button>
                <button type="button" className="g-gate-btn" onClick={() => setGateMode("super")}>
                  👑 Superadmin
                </button>
                {relogin && (
                  <button
                    type="button"
                    className="g-gate-btn"
                    onClick={() => {
                      setGate(false);
                      setRelogin(false);
                      g.current.open = false;
                    }}
                  >
                    ← Keep playing as a visitor
                  </button>
                )}
              </div>
            ) : (
              <form className="g-gate-form" onSubmit={adminLogin}>
                <label htmlFor="g-pw">
                  {gateMode === "super" ? "Superadmin password" : "Owner password (Sheza)"}
                </label>
                <input
                  id="g-pw"
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
                {gateErr && <p className="g-gate-err">{gateErr}</p>}
                <div className="g-gate-btns">
                  <button
                    type="submit"
                    className="g-gate-btn g-gate-primary"
                    disabled={gateBusy || !pw}
                  >
                    🔑 {gateBusy ? "Checking…" : "Log in"}
                  </button>
                  <button
                    type="button"
                    className="g-gate-btn"
                    onClick={() => {
                      setGateMode("choose");
                      setGateErr(null);
                    }}
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
            <p className="g-gate-note">
              {relogin
                ? "Sign in to unlock the admin tools."
                : "Visitors can read every post. Others who are online will see you walking around."}
            </p>
          </div>
        </div>
      )}

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
                <li>🏘️ Town: {canAdmin ? "About · Home · Admin · Jukebox" : "About · Home · Jukebox"}</li>
                <li>🏠 Home: cook, eat, pet the cat, sleep</li>
                <li>😊 Emotes: buttons or keys 1-4, actions 5-7</li>
                <li>💬 Chat: press T</li>
                {admin && <li>👑 F: fly · Shift: speed · click the map to teleport</li>}
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
          {openKey === ADMIN ? (
            // The admin site lives in a frame so its own login and pages work
            // unchanged. Built here (not on the server) so only owners ever get it.
            <iframe src="/admin" title="Admin" className="admin-frame" />
          ) : (
            nodes[openKey]
          )}
        </PostModal>
      )}
    </div>
  );
}
