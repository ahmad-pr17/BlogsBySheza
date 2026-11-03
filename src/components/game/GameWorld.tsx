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
import { DAY_NIGHT_ENABLED, darknessAt, labelAt, skipSeconds } from "@/components/game/daynight";
import { mulberry32 } from "@/components/game/rng";
import { sound } from "@/components/game/sound";
import { loadArt, type Art } from "@/components/game/art";
import { buildGround, type Ground } from "@/components/game/ground";
import {
  buildHome,
  buildHomeBg,
  drawHomeScene,
  stageFor,
  UNLOCK_AT,
  UNLOCK_TEXT,
  type HomeDrawState,
} from "@/components/game/home";
import {
  DEFAULT_CHOICE,
  FOX_CHOICE,
  HEAD_TOP,
  OWNER_CHOICE,
  isKind,
  labelOf,
  type CharKind,
  type Choice,
} from "@/components/game/characters";
import { cleanMessage, messageProblem } from "@/components/game/names";
import { GateScreen } from "@/components/game/GateScreen";
import { HelpPanel } from "@/components/game/HelpPanel";
import { ACTIONS, HudBar, QUICK } from "@/components/game/HudBar";
import { RecipeBook, RECIPES } from "@/components/game/RecipeBook";
import {
  ACTION_SECONDS,
  connectMultiplayer,
  randomName,
  type Multiplayer,
  type PlayerInfo,
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
const HOME_KEY = "trail-home";

// The apology on the big board at the start point.
const SORRY_LINES = [
  "Sorry for making you feel ignored",
  "from my side.",
  "Sorry for anything I said or did that didn't",
  "feel right, or felt ignorant and rude,",
  "or anything bad.",
];

// The kind reminders on the second board.
const KIND_LINES = [
  "It's normal to laugh when someone trips.",
  "It's okay to notice change in yourself.",
  "You are not toxic.",
  "Things take their own time and way.",
  "Believe and trust Allah.",
];

type Scene = "out" | "home";
type Role = "visitor" | "owner" | "super";


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
  const [cooked, setCooked] = useState(0); // meals cooked in this browser
  const homeStage = stageFor(cooked);
  const home = useMemo(() => buildHome(homeStage), [homeStage]);
  const scenes = useMemo(() => ({ out: world, home }), [world, home]);

  const initialInteract = initialSlug
    ? world.interacts.find((i) => i.slug === initialSlug)
    : undefined;

  // The entry screen always asks who you are, except on a direct link to a
  // post or page. Superadmin powers come only from typing the password here,
  // never from an old admin cookie.
  const gateInitial = !(initialSlug || initialPage);
  const [gate, setGate] = useState(gateInitial);
  const [relogin, setRelogin] = useState(false); // opened later from the game, not at the start
  const [online, setOnline] = useState(1);
  const [mpOn, setMpOn] = useState(false);
  const [flyUi, setFlyUi] = useState(false);
  const [boostUi, setBoostUi] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [timeLabel, setTimeLabel] = useState("☀️ Day");
  const soundMuted = useSyncExternalStore(sound.subscribe, sound.isMuted, () => false);
  const [chatOpen, setChatOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
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
    cookSecs: 3, // how long the current dish takes
    cookRecipe: 0,
    cooked: 0, // mirror of the cooked state, for the frame loop
    dish: null as string | null,
    dishName: "",
    night: false,
    dayShift: 0, // seconds: sleeping skips your own view of the clock ahead
    timeLabel: "☀️ Day",
    reading: initialInteract?.slug ?? "",
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
    silencedUntil: 0, // a moderator muted your chat until this time
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

  const dismissGate = useCallback(() => {
    sound.unlock(); // a click got us here, so the browser lets sound start
    try {
      const n = Number(JSON.parse(localStorage.getItem(HOME_KEY) ?? "{}").cooked) || 0;
      g.current.cooked = n;
      setCooked(n);
    } catch {
      /* ignore */
    }
    setGate(false);
    setRelogin(false);
    g.current.open = false;
  }, []);

  // A visitor who is already playing can still sign in as Sheza or the superadmin.
  const openLogin = useCallback(() => {
    setRelogin(true);
    setEmoteOpen(false);
    setChatOpen(false);
    g.current.target = null;
    g.current.keys.clear();
    g.current.open = true;
    setGate(true);
  }, []);

  // What the entry screen reports back.
  const handleVisitor = (c: Choice, name: string) => {
    g.current.choice = c;
    g.current.chosenName = name;
    dismissGate();
  };
  const handleLoggedIn = (r: "owner" | "super") => {
    setFlyUi(false);
    setBoostUi(false);
    setRole(r);
    if (r === "super") dismissGate(); // Sheza still picks a character first
  };
  const handleOwnerStart = (c: Choice) => {
    g.current.ownerChoice = c;
    dismissGate();
  };
  const cancelLogin = () => {
    setGate(false);
    setRelogin(false);
    g.current.open = false;
  };

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
      onEvent: (kind) => sound.play(kind === "chat" ? "chat" : "pop"),
      onSilenced: (ms) => {
        g.current.silencedUntil = performance.now() + ms;
        showToast(
          ms > 0
            ? `A moderator muted your chat for ${Math.ceil(ms / 60000)} min.`
            : "Your chat is unmuted again.",
        );
      },
    });
    mpRef.current = mp;
    return () => {
      mp.close();
      mpRef.current = null;
      setMpOn(false);
    };
  }, [gate, admin, owner, showToast]);

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
    sound.play("pop");
  }, []);

  // The players list: refresh while it is open.
  useEffect(() => {
    if (!playersOpen) return;
    const id = setInterval(() => setPlayers(mpRef.current?.players() ?? []), 1000);
    return () => clearInterval(id);
  }, [playersOpen]);

  const togglePlayers = () => {
    setPlayers(mpRef.current?.players() ?? []);
    setEmoteOpen(false);
    setChatOpen(false);
    setPlayersOpen((o) => !o);
  };

  const toggleMute = (p: PlayerInfo) => {
    mpRef.current?.mute(p.id, !p.muted);
    setPlayers(mpRef.current?.players() ?? []);
  };

  // Owner / superadmin: silence a visitor's chat and emotes for 10 minutes.
  const silence = async (p: PlayerInfo, minutes: number) => {
    try {
      const res = await fetch("/api/realtime/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: p.id, minutes }),
      });
      showToast(
        res.ok
          ? minutes > 0
            ? `${p.name} is silenced for ${minutes} min.`
            : `${p.name} can chat again.`
          : "Could not do that. Are you still logged in?",
      );
    } catch {
      showToast("Could not reach the server.");
    }
  };

  // Choose a recipe from the book and start cooking.
  const startCooking = (i: number) => {
    const s = g.current;
    const r = RECIPES[i];
    if (!r || s.cooked < r.need) return;
    s.cookRecipe = i;
    s.cookSecs = r.secs;
    s.cook = 0;
    s.dir = 0;
    s.open = false;
    s.busy = true;
    setRecipesOpen(false);
    sound.play("sizzle");
  };
  const closeRecipes = () => {
    g.current.open = false;
    setRecipesOpen(false);
  };
  useEffect(() => {
    if (!recipesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        g.current.open = false;
        setRecipesOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recipesOpen]);

  // A typed message: shown above your head and sent to everyone online.
  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const s = g.current;
    if (performance.now() < s.silencedUntil) {
      showToast("Your chat is muted for now.");
      return;
    }
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
    sound.play("chat");
    setChatText("");
    if (touch) setChatOpen(false);
  };

  // Press T to start typing.
  useEffect(() => {
    if (chatOpen) chatRef.current?.focus();
  }, [chatOpen]);

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

  const openModal = useCallback(
    (key: string, url: string) => {
    g.current.open = true;
    g.current.reading = stops.some((st) => st.slug === key) ? key : "";
    g.current.target = null;
    g.current.keys.clear();
    setOpenKey(key);
    window.history.replaceState(null, "", url);
    },
    [stops],
  );

  const closeModal = useCallback(() => {
    g.current.open = false;
    g.current.reading = "";
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
      sound.play("door");
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
          sound.play("chime");
          break;
        case "cook":
          if (s.dish) {
            showToast(`The table already has ${s.dishName}. Eat it first!`);
            break;
          }
          s.target = null;
          s.keys.clear();
          s.open = true; // the recipe book is open: stand still
          setRecipesOpen(true);
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
    cooked: setCooked as (n: number) => void,
  });
  useEffect(() => {
    act.current = {
      activate,
      goTo,
      toast: showToast,
      fly: toggleFly,
      emote: sendEmote,
      chat: openChat,
      cooked: setCooked as (n: number) => void,
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

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    let stepAcc = 0; // time since the last footstep sound
    let birdIn = 5; // seconds until the next bird chirps
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      const W = cur();

      // ---- time of day (shared clock; calm mode stays in daylight) ----
      const dark = reduceMotion ? 0 : darknessAt(s.dayShift);
      s.night = dark > 0.5;
      const timeText = reduceMotion ? "☀️ Day" : labelAt(s.dayShift);
      if (timeText !== s.timeLabel) {
        s.timeLabel = timeText;
        setTimeLabel(timeText);
      }

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
            s.dayShift += skipSeconds(s.dayShift);
          }
        } else if (k.t < 3.6) sleepA = 1 - (k.t - 2.7) / 0.9;
        else {
          s.sleep = null;
          act.current.toast(s.night ? "You slept until evening. Cozy..." : "Good morning!");
        }
      }
      if (s.cook >= 0) {
        s.cook += dt / s.cookSecs;
        if (s.cook >= 1) {
          s.cook = -1;
          const r = RECIPES[s.cookRecipe] ?? RECIPES[0];
          s.dish = r.key;
          s.dishName = r.name;
          s.cooked += 1;
          const before = stageFor(s.cooked - 1);
          const after = stageFor(s.cooked);
          try {
            localStorage.setItem(HOME_KEY, JSON.stringify({ cooked: s.cooked }));
          } catch {
            /* ignore */
          }
          act.current.cooked(s.cooked);
          act.current.toast(
            after > before
              ? `You cooked ${r.name}! Your home got cozier: ${UNLOCK_TEXT[after - 1]}.`
              : `You cooked ${r.name}! It is on the table.`,
          );
          sound.play("chime");
        }
      }
      s.busy = !!s.fade || !!s.sleep || s.cook >= 0;

      // a bird now and then, outdoors only
      birdIn -= dt;
      if (birdIn <= 0) {
        birdIn = 6 + Math.random() * 9;
        if (s.scene === "out" && !s.open) sound.play("bird");
      }

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
          if (!s.fly) {
            stepAcc += dt;
            if (stepAcc > 0.32) {
              stepAcc = 0;
              sound.play(s.scene === "home" ? "stepWood" : "step");
            }
          }
        } else stepAcc = 0;

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
          read: s.reading,
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

      // (the apology board is wide, so keep objects a little longer in view)
      const vis = world.objects.filter(
        (o) =>
          inView(o) ||
          ((o.key === "sorryBoard" || o.key === "kindBoard") &&
            Math.abs(o.x - (s.camX + vw / 2)) < vw / 2 + 90),
      );
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
        if (o.key === "sorryBoard") {
          // the words on the board (drawn as text so they stay sharp)
          const cx = Math.round(o.x);
          const top = Math.round(o.y - cv.height);
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = "#a1352a";
          ctx.font = `14px ${family}`;
          ctx.fillText("SORRY", cx, top + 20);
          ctx.fillStyle = "#3a2a18";
          ctx.font = `5.6px ${family}`;
          SORRY_LINES.forEach((line, i) =>
            ctx.fillText(line, cx, top + 30 + i * 7 + (i >= 2 ? 3 : 0)),
          );
          ctx.textAlign = "start";
        }
        if (o.key === "kindBoard") {
          const cx = Math.round(o.x);
          const top = Math.round(o.y - cv.height);
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = "#a1352a";
          ctx.font = `10px ${family}`;
          ctx.fillText("REMEMBER", cx, top + 18);
          ctx.fillStyle = "#3a2a18";
          ctx.font = `5.2px ${family}`;
          KIND_LINES.forEach((line, i) => ctx.fillText(line, cx, top + 29 + i * 6.6));
          ctx.textAlign = "start";
        }
      }
      while (ai < actors.length) actors[ai++].draw();

      // fireflies over the grass (only the ones on screen)
      for (const f of reduceMotion ? [] : flies) {
        if (f.x < s.camX - 12 || f.x > s.camX + vw + 12 || f.y < s.camY - 12 || f.y > s.camY + vh + 12) continue;
        const a = Math.max(0, Math.sin(t * 1.7 + f.p * 3));
        const glow = Math.min(1, (0.25 + 0.75 * a * a) * (0.6 + dark * 1.1));
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

      // dusk and night: dim the world, light the lamps and the campfire
      if (dark > 0.02) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = `rgba(14,20,66,${0.5 * dark})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(255,140,60,${0.13 * Math.sin(Math.PI * Math.min(1, dark))})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "lighter";
        for (const o of vis) {
          const isLamp = o.key === "lamp";
          if (!isLamp && o.key !== "campfire") continue;
          const gx = (o.x - s.camX) * S;
          const gy = (o.y - (isLamp ? 30 : 8) - s.camY) * S;
          const gr = (isLamp ? 56 : 78) * S;
          const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
          grad.addColorStop(0, `rgba(255,205,120,${0.5 * dark})`);
          grad.addColorStop(1, "rgba(255,205,120,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
        }
        ctx.globalCompositeOperation = "source-over";
      }

      // ---- screen-space labels ----
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const it of world.interacts) {
        if (!inView({ x: it.signX, y: it.signY })) continue;
        const lift = it.kind === "post" ? 36 : BIG.has(it.id) ? 70 : 34;
        const sx = (it.signX - s.camX) * S;
        const sy = (it.signY - lift - s.camY) * S;
        let text = it.label;
        if (it.kind === "post" && it.slug) {
          // how many people are reading this post right now
          let n = s.reading === it.slug ? 1 : 0;
          for (const r of mpRef.current?.remotes.values() ?? []) if (r.reading === it.slug) n++;
          if (n > 0) text = `📖${n} ${text}`;
        }
        drawTag(text, sx, sy, it.id === s.near);
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
      } else if (k === "m") {
        sound.setMuted(!sound.isMuted());
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
    <div
      className="g-root"
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("button")) sound.play("click");
      }}
    >
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
        {DAY_NIGHT_ENABLED && <span>{timeLabel}</span>}
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
        <HudBar
          touch={touch}
          admin={admin}
          canAdmin={canAdmin}
          chat={{
            open: chatOpen,
            text: chatText,
            onToggle: () => setChatOpen((o) => !o),
            onText: setChatText,
            onClose: () => setChatOpen(false),
            onSubmit: sendChat,
          }}
          chatInputRef={chatRef}
          sound={{ muted: soundMuted, onToggle: () => sound.setMuted(!soundMuted) }}
          playersPanel={{
            open: playersOpen,
            players,
            onToggle: togglePlayers,
            onMute: toggleMute,
            onSilence: silence,
          }}
          emotes={{
            open: emoteOpen,
            onToggle: () => setEmoteOpen((o) => !o),
            onClose: () => setEmoteOpen(false),
            onSend: sendEmote,
          }}
          flyUi={flyUi}
          boostUi={boostUi}
          onFly={toggleFly}
          onBoost={toggleBoost}
          onLogin={openLogin}
          onLogout={adminLogout}
        />
      )}

      {recipesOpen && (
        <RecipeBook
          cooked={cooked}
          nextUnlock={UNLOCK_AT.find((n) => n > cooked)}
          onChoose={startCooking}
          onClose={closeRecipes}
        />
      )}

      {gate && (
        <GateScreen
          art={assets?.art ?? null}
          relogin={relogin}
          onCancel={cancelLogin}
          onVisitor={handleVisitor}
          onLoggedIn={handleLoggedIn}
          onOwnerStart={handleOwnerStart}
        />
      )}

      <HelpPanel
        open={helpPref ?? !touch}
        onToggle={() => setHelpPref(!(helpPref ?? !touch))}
        touch={touch}
        canAdmin={canAdmin}
        admin={admin}
      />

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
      <section className="sr-only" aria-label="A note at the start of the town">
        <p>
          Sorry for making you feel ignored from my side. Sorry for anything I said or did that
          didn&apos;t feel right, or felt ignorant and rude, or anything bad.
        </p>
      </section>

      <section className="sr-only" aria-label="Kind reminders at the start of the town">
        <p>
          It&apos;s normal to laugh when someone trips. It&apos;s okay to notice change in yourself.
          You are not toxic. Things take their own time and way. Believe and trust Allah.
        </p>
      </section>

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
