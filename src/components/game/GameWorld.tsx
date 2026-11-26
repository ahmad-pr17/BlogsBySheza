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
import { DAY_NIGHT_ENABLED, lightAt, nextPeriodSeconds, skipSeconds, type Light } from "@/components/game/daynight";
import { mulberry32 } from "@/components/game/rng";
import { sound, type SoundName } from "@/components/game/sound";
import { loadArt, type Art } from "@/components/game/art";
import { buildGround, type Ground } from "@/components/game/ground";
import {
  arrival,
  buildRoom,
  buildRoomBg,
  drawRoomScene,
  KNIGHT_LINES,
  stageFor,
  UNLOCK_AT,
  UNLOCK_TEXT,
  type RoomDrawState,
} from "@/components/game/palace";
import type { RoomId, Scene } from "@/components/game/scenes";
import { BoardEditor } from "@/components/game/BoardEditor";
import { CookingGame } from "@/components/game/CookingGame";
import { FishingGame } from "@/components/game/FishingGame";
import { Library } from "@/components/game/Library";
import { PianoModal } from "@/components/game/PianoModal";
import { TvModal } from "@/components/game/TvModal";
import { CanAdminContext } from "@/components/game/AdminContext";
import { Easel } from "@/components/game/Easel";
import { StudyDesk } from "@/components/game/StudyDesk";
import { composeRooms } from "@/components/game/gallery";
import { pomodoro, PHASE_LABEL } from "@/components/game/pomodoro";
import { playerBus } from "@/lib/playerBus";
import {
  clampX,
  clampY,
  FRAME_H,
  FRAME_W,
  SHOWROOM_SLOTS,
  WALL_BOTTOM,
  type Gallery,
  type GalleryEvent,
  type PlacedPainting,
} from "@/lib/galleryShared";
import { Wardrobe } from "@/components/game/Wardrobe";
import { DEFAULT_STYLE, drawFlowerCrown, drawHairExtras, drawOutfit, hairSheet, headAnchor, loadStyle, OUTFITS, saveStyle, type Style } from "@/components/game/style";
import {
  cleanBoard,
  isBoardId,
  type BoardId,
  type BoardText,
  type BoardTexts,
} from "@/lib/boardText";
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
  type WorldEvent,
  type WorldState,
} from "@/components/game/multiplayer";
import {
  buildWorld,
  footFree,
  planRoute,
  tileBlocked,
  T,
  type Stop,
} from "@/components/game/world";

// the colours of the dance glow: yellow and blue
const DANCE_HUES = [48, 215];

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

// The words on a notice board, drawn onto the board sprite so they stay sharp
// (the board's text can be edited in the game, so it is not baked into the art).
function drawBoardText(
  ctx: CanvasRenderingContext2D,
  family: string,
  b: BoardText,
  cx: number,
  top: number,
  wide: boolean,
) {
  const fit = (text: string, y: number, size: number, maxW: number) => {
    ctx.font = `${size}px ${family}`;
    const w = ctx.measureText(text).width;
    if (w > maxW) ctx.font = `${((size * maxW) / w).toFixed(2)}px ${family}`;
    ctx.fillText(text, cx, y);
  };
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const maxW = wide ? 124 : 108;
  if (b.title) {
    ctx.fillStyle = "#a1352a";
    fit(b.title, top + (wide ? 20 : 18), wide ? 14 : 10, wide ? 100 : 84);
  }
  const n = b.lines.length;
  const first = top + (wide ? 30 : 29);
  const step = Math.min(wide ? 7.2 : 6.6, 28 / Math.max(1, n - 1));
  ctx.fillStyle = "#3a2a18";
  b.lines.forEach((line, i) => fit(line, first + i * step, step < 6 ? 4.8 : wide ? 5.6 : 5.2, maxW));
  ctx.textAlign = "start";
}

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
  boards: initialBoards,
  gallery: initialGallery,
}: {
  stops: Stop[];
  nodes: Record<string, ReactNode>;
  boards: BoardTexts;
  gallery: Gallery;
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
  // A refresh hands us new "stops" objects even when nothing changed; only
  // rebuild the town when the posts really changed.
  const stopsKey = JSON.stringify(stops);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableStops = useMemo(() => stops, [stopsKey]);
  const world = useMemo(() => buildWorld(stableStops, canAdmin, canAdmin), [stableStops, canAdmin]);
  const [cooked, setCooked] = useState(0); // meals cooked in this browser
  const homeStage = stageFor(cooked);
  const rooms = useMemo(
    () => ({
      home: buildRoom("home", homeStage),
      kitchen: buildRoom("kitchen", homeStage),
      living: buildRoom("living", homeStage),
      bedroom: buildRoom("bedroom", homeStage),
      study: buildRoom("study", homeStage),
      ballroom: buildRoom("ballroom", homeStage),
      gallery: buildRoom("gallery", homeStage),
    }),
    [homeStage],
  );
  const scenes = useMemo(() => ({ out: world, ...rooms }), [world, rooms]);

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
  const [boards, setBoards] = useState<BoardTexts>(initialBoards);
  const boardsRef = useRef(boards);
  const [editBoard, setEditBoard] = useState<BoardId | null>(null);
  const [cookIdx, setCookIdx] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [fishing, setFishing] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);
  const [tvChannel, setTvChannel] = useState(1);
  const [pianoOpen, setPianoOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [easelOpen, setEaselOpen] = useState(false);
  const [gallery, setGallery] = useState<Gallery>(initialGallery);
  // each room's wall with its paintings on it (rooms without paintings use the plain background)
  const paintedBgs = useRef<Partial<Record<RoomId, HTMLCanvasElement>>>({});
  // a painting Sheza is carrying: click a wall in any room to hang it
  const [hang, setHang] = useState<{ data: string; id: string | null } | null>(null);
  // what everyone shares (jars, TV, jukebox, study timer), as far as we know
  const shared = useRef<{ tv: number | null; song: { id: string; playing: boolean } | null }>({ tv: null, song: null });
  const worldHandler = useRef<(e: WorldEvent) => void>(() => {});
  const contentChanged = useRef<() => void>(() => {});
  const applyGallery = (e: GalleryEvent) =>
    setGallery((prev) =>
      e.op === "remove"
        ? prev.filter((p) => p.id !== e.id)
        : [...prev.filter((p) => p.id !== e.painting.id), e.painting],
    );
  const [wardrobe, setWardrobe] = useState<{ tab: "dress" | "hair"; tint: number } | null>(null);
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE);
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
    roomBgs: Record<RoomId, HTMLCanvasElement>;
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
    tv: 1, // the channel the living-room TV shows
    style: DEFAULT_STYLE as Style, // Sheza's dress and hair
    swarm: [] as { x: number; y: number; vx: number; vy: number; p: number; born: number; life: number }[], // fireflies let out of jars
    jars: {} as Record<string, number>, // jar id -> when it is full again (ms)
    knightTalk: 0,
    globeSpins: 0,
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
    hang: null as null | { data: string; id: string | null }, // the painting being hung
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
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

  const dismissGate = useCallback(() => {
    sound.unlock(); // a click got us here, so the browser lets sound start
    try {
      const n = Number(JSON.parse(localStorage.getItem(HOME_KEY) ?? "{}").cooked) || 0;
      g.current.cooked = n;
      setCooked(n);
      const st = loadStyle();
      g.current.style = st;
      setStyle(st);
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
      onWorld: (e) => worldHandler.current(e),
      onContent: () => contentChanged.current(),
      onGallery: (e) => applyGallery(e),
      getWorld: (): WorldState => {
        const now = performance.now();
        const jars: Record<string, number> = {};
        for (const [id, until] of Object.entries(g.current.jars)) if (until > now) jars[id] = Math.round(until - now);
        return { jars, tv: shared.current.tv, song: shared.current.song, pomo: pomodoro.wire() };
      },
      onBoard: (id, board) => {
        const clean = cleanBoard(board);
        if (isBoardId(id) && clean) setBoards((prev) => ({ ...prev, [id]: clean }));
      },
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
    // share the jukebox and the study timer with everyone
    playerBus.setLocalListener((id, playing) => {
      shared.current.song = { id, playing };
      mp.world({ k: "song", id, playing });
    });
    pomodoro.setBroadcast((w) => mp.world({ k: "pomo", w }));
    return () => {
      playerBus.setLocalListener(null);
      pomodoro.setBroadcast(null);
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
    if (k === "!princess" && !(g.current.owner || g.current.admin)) {
      showToast("👸 The princess dance is Sheza's.");
      return;
    }
    if (k.startsWith("!")) {
      if (!ACTION_SECONDS[k]) return;
      g.current.myAct = { k, at: performance.now() };
    } else {
      g.current.myEmote = { k, at: performance.now() };
    }
    mpRef.current?.emote(k);
    sound.play(k === "!princess" || k === "!waltz" ? "chime" : "pop");
  }, [showToast]);

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

  // Choose a recipe from the book: the cooking game opens.
  const startCooking = (i: number) => {
    const s = g.current;
    const r = RECIPES[i];
    if (!r || s.cooked < r.need) return;
    s.cookRecipe = i;
    s.cook = 0.5; // steam over the stove while you cook
    s.dir = 0;
    s.open = true;
    s.busy = true;
    setRecipesOpen(false);
    setCookIdx(i);
    sound.play("sizzle");
  };
  const cancelCooking = () => {
    const s = g.current;
    s.cook = -1;
    s.open = false;
    s.busy = false;
    setCookIdx(null);
  };
  const finishCooking = (stars: number) => {
    const s = g.current;
    const r = RECIPES[s.cookRecipe] ?? RECIPES[0];
    s.cook = -1;
    s.open = false;
    s.busy = false;
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
    setCooked(s.cooked);
    setCookIdx(null);
    const rating = "⭐".repeat(stars);
    showToast(
      after > before
        ? `${rating} You cooked ${r.name}! The palace got cosier: ${UNLOCK_TEXT[after - 1]}.`
        : `${rating} You cooked ${r.name}! It is on the table.`,
    );
    sound.play("chime");
  };
  const changeChannel = (n: number) => {
    g.current.tv = n;
    shared.current.tv = n;
    setTvChannel(n);
    mpRef.current?.world({ k: "tv", n });
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
      const from = s.scene;
      sound.play("door");
      s.scene = to;
      s.near = null;
      setNearId(null);
      setScene(to);
      if (to !== "out") {
        const a = arrival(to, from);
        s.x = a.x;
        s.y = a.y;
        s.dir = a.dir;
      } else {
        const door = world.interacts.find((i) => i.id === "home");
        if (door) {
          s.x = door.spotX;
          s.y = door.spotY;
        }
        s.dir = 4;
      }
    },
    [world],
  );

  // Popups (library, fishing, TV, piano, board editor): you stand still while one is open.
  const openPopup = useCallback((show: () => void) => {
    const s = g.current;
    s.target = null;
    s.route = [];
    s.keys.clear();
    s.open = true;
    show();
  }, []);
  const closePopup = useCallback((hide: () => void) => {
    g.current.open = false;
    hide();
  }, []);
  const playSound = useCallback((name: string) => sound.play(name as SoundName), []);

  // New posts, songs or comments appear without a reload: when the server says
  // something changed (or the tab comes back after a while), fetch the page's
  // data again. Players wait a random moment so they do not all ask at once.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      router.refresh();
    };
    contentChanged.current = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, 300 + Math.random() * 2500);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 60000) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      contentChanged.current = () => {};
    };
  }, [router]);

  // Let the fireflies out of a jar. Whoever opens it, it opens for everyone:
  // the jar is empty for a while on every screen.
  const spillJar = useCallback(
    (what: string, remote: boolean) => {
      const s = g.current;
      const it = world.interacts.find((i) => i.act === what);
      if (!it) return;
      const now = performance.now();
      if ((s.jars[what] ?? 0) > now) {
        if (!remote) showToast("The jar is empty. The fireflies will come back soon.");
        return;
      }
      s.jars[what] = now + 100000;
      const born = now / 1000;
      const n = 11 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 8 + Math.random() * 20;
        s.swarm.push({
          x: it.signX + Math.cos(a) * 2,
          y: it.signY - 2 + Math.sin(a) * 2,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 12,
          p: Math.random() * Math.PI * 2,
          born,
          life: 22 + Math.random() * 12,
        });
      }
      if (s.swarm.length > 130) s.swarm.splice(0, s.swarm.length - 130);
      if (remote) {
        if (s.scene === "out") showToast("✨ Someone let the fireflies out of a jar!");
      } else {
        sound.play("chime");
        showToast("✨ A cloud of fireflies floats out!");
        mpRef.current?.world({ k: "jar", id: what });
      }
    },
    [world, showToast],
  );

  // Changes other players make to the shared things.
  useEffect(() => {
    worldHandler.current = (e: WorldEvent) => {
      const s = g.current;
      const applyTv = (n: number) => {
        s.tv = n;
        shared.current.tv = n;
        setTvChannel(n);
      };
      const applySong = (id: string, playing: boolean) => {
        shared.current.song = { id, playing };
        playerBus.applyRemote(id, playing);
      };
      if (e.k === "jar") spillJar(e.id, true);
      else if (e.k === "tv") applyTv(e.n);
      else if (e.k === "song") applySong(e.id, e.playing);
      else if (e.k === "pomo") pomodoro.apply(e.w);
      else {
        // what a newcomer is told: jars that are still empty, TV, music, timer
        const now = performance.now();
        for (const [id, ms] of Object.entries(e.s.jars)) s.jars[id] = now + ms;
        if (e.s.tv) applyTv(e.s.tv);
        if (e.s.song) applySong(e.s.song.id, e.s.song.playing);
        if (e.s.pomo) pomodoro.apply(e.s.pomo);
      }
    };
  }, [spillJar]);

  // The study timer: tick it, and say when a session ends (for everyone).
  useEffect(() => {
    pomodoro.onFinish((from, to) => {
      sound.play("chime");
      showToast(
        from === "focus"
          ? `🍅 Focus session done! Time for a ${PHASE_LABEL[to].toLowerCase()}.`
          : "☕ Break over. Ready for the next focus session?",
      );
    });
    const id = setInterval(() => pomodoro.tick(), 500);
    return () => {
      clearInterval(id);
      pomodoro.onFinish(null);
      sound.lofiStop();
    };
  }, [showToast]);

  // Paintings on the palace walls: framed onto each room's background.
  useEffect(() => {
    if (!assets) return;
    let alive = true;
    composeRooms(assets.roomBgs, gallery).then((out) => {
      if (alive) paintedBgs.current = out;
    });
    return () => {
      alive = false;
    };
  }, [assets, gallery]);

  // ---- hanging paintings (Sheza and the superadmin) ----
  const putPainting = useCallback(
    async (p: { id: string | null; room: RoomId; x: number; y: number; data: string }): Promise<string | null> => {
      try {
        const res = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "put", painting: { ...p, id: p.id ?? undefined } }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) return res.status === 401 ? "Please log in again to hang paintings." : (body?.error ?? "Could not hang it.");
        applyGallery({ op: "put", painting: body.painting });
        return null;
      } catch {
        return "Could not reach the server.";
      }
    },
    [],
  );

  const startHanging = useCallback(
    (data: string, id: string | null) => {
      closePopup(() => setEaselOpen(false));
      g.current.hang = { data, id };
      setHang({ data, id });
      showToast("🖼 Click a wall to hang it. You can walk to any room first.");
    },
    [closePopup, showToast],
  );
  const cancelHanging = useCallback(() => {
    g.current.hang = null;
    setHang(null);
  }, []);

  // The showroom puts it in the next free spot on its walls.
  const hangInShowroom = useCallback(
    async (data: string, id: string | null): Promise<string | null> => {
      const mine = gallery.find((p) => p.id === id);
      const used = gallery.filter((p) => p.room === "gallery" && p.id !== id);
      const free = mine?.room === "gallery"
        ? { x: mine.x, y: mine.y }
        : SHOWROOM_SLOTS.find((sl) => !used.some((p) => Math.abs(p.x - sl.x) < FRAME_W && Math.abs(p.y - sl.y) < FRAME_H));
      if (!free) return "The showroom is full. Take a painting down first.";
      const err = await putPainting({ id, room: "gallery", x: free.x, y: free.y, data });
      if (!err) {
        cancelHanging();
        showToast("🏛 Hung in the showroom!");
      }
      return err;
    },
    [gallery, putPainting, cancelHanging, showToast],
  );

  const takeDown = useCallback(async (id: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id }),
      });
      if (!res.ok) return res.status === 401 ? "Please log in again." : "Could not take it down.";
      applyGallery({ op: "remove", id });
      return null;
    } catch {
      return "Could not reach the server.";
    }
  }, []);

  // Esc drops the painting you are carrying.
  useEffect(() => {
    if (!hang) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelHanging();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hang, cancelHanging]);

  const handleAct = useCallback(
    (what: string) => {
      const s = g.current;
      if (what.startsWith("go:")) {
        const to = what.slice(3) as Scene;
        fadeTo(() => switchScene(to));
        return;
      }
      if (what.startsWith("knight:")) {
        const lines = KNIGHT_LINES[Number(what.slice(7))] ?? KNIGHT_LINES[0];
        showToast(`💂 ${lines[s.knightTalk++ % lines.length]}`);
        sound.play("pop");
        return;
      }
      if (what.startsWith("jar:")) {
        spillJar(what, false);
        return;
      }
      if (what.startsWith("board:")) {
        const id = what.slice(6);
        if (isBoardId(id)) openPopup(() => setEditBoard(id));
        return;
      }
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
          openPopup(() => setRecipesOpen(true)); // the recipe book is open: stand still
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
          openPopup(() => setLibraryOpen(true));
          break;
        case "throne":
          s.myEmote = { k: "👑", at: performance.now() };
          mpRef.current?.emote("👑");
          sound.play("fanfare");
          showToast("👑 You sit on the throne. Long live the monarch!");
          break;
        case "tv":
          openPopup(() => setTvOpen(true));
          break;
        case "piano":
          openPopup(() => setPianoOpen(true));
          break;
        case "study":
          openPopup(() => setStudyOpen(true));
          break;
        case "easel":
          if (s.owner || s.admin) openPopup(() => setEaselOpen(true));
          else showToast("🎨 Sheza's easel. Her paintings hang on the study walls.");
          break;
        case "wardrobe":
        case "mirror":
          if (!s.owner) {
            if (what === "wardrobe") {
              showToast("👗 This is Sheza's wardrobe.");
            } else {
              s.myEmote = { k: "✨", at: performance.now() };
              mpRef.current?.emote("✨");
              sound.play("chime");
              showToast("✨ You look lovely today.");
            }
          } else if (s.me.kind !== "farmer") {
            showToast("👗 Dresses fit the farmer best. Pick the farmer at the entry screen.");
          } else {
            const tint = s.me.tint;
            sound.play("chime");
            openPopup(() => setWardrobe({ tab: what === "mirror" ? "hair" : "dress", tint }));
          }
          break;
        case "globe": {
          const facts = [
            "The globe spins... and stops on the ocean. Mostly water down there!",
            "It stops on Japan. Cherry blossoms and ramen shops.",
            "It stops on the Pacific. Home to the deepest trench on Earth.",
            "It stops on Malaysia. Pineapple tart season is the best season.",
            "It stops on Pakistan. Somewhere, someone is making biryani right now.",
          ];
          showToast(`🌍 ${facts[s.globeSpins++ % facts.length]}`);
          sound.play("page");
          break;
        }
        case "dance": {
          // the waltz floor: Sheza dances the princess dance, everyone else waltzes
          const k = s.owner || s.admin ? "!princess" : "!waltz";
          s.target = null;
          s.myAct = { k, at: performance.now() };
          mpRef.current?.emote(k);
          sound.waltz(k === "!princess" ? 23 : 14);
          showToast(k === "!princess" ? "👸 A princess dance!" : "🎶 A waltz for you!");
          break;
        }
        case "harp":
          [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => sound.note(f), i * 110));
          showToast("🎶 You pluck the harp.");
          break;
        case "fish":
          openPopup(() => setFishing(true));
          break;
      }
    },
    [fadeTo, switchScene, showToast, openPopup, spillJar],
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
          setAssets({
            art,
            ground: buildGround(world, art),
            roomBgs: Object.fromEntries(
              (["home", "kitchen", "living", "bedroom", "study", "ballroom", "gallery"] as RoomId[]).map((id) => [id, buildRoomBg(id, art)]),
            ) as Record<RoomId, HTMLCanvasElement>,
          });
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
    const { art, ground, roomBgs } = assets;
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
      const target = cw < 640 ? 2 : cw < 1700 ? 3 : 4;
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
        if (it.id.startsWith("jar:")) continue;
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

    // Birds: they perch on roofs, lamps and benches, and flit away when you walk up.
    type Bird = {
      x: number; y: number; z: number;
      fx: number; fy: number; fz: number;
      tx: number; ty: number; tz: number;
      flying: boolean; t: number; dur: number; wait: number; col: number; face: number;
    };
    const perches: [number, number, number][] = [];
    for (const o of world.objects) {
      if (o.key.startsWith("house")) perches.push([o.x - 13, o.y, 46], [o.x + 13, o.y, 46]);
      else if (o.key === "home") perches.push([o.x - 15, o.y, 78], [o.x + 15, o.y, 78]);
      else if (o.key === "lamp") perches.push([o.x, o.y, 37]);
      else if (o.key === "bench") perches.push([o.x - 6, o.y, 9], [o.x + 6, o.y, 9]);
      else if (o.key === "fencePost") perches.push([o.x, o.y, 13]);
      else if (o.key === "sign0") perches.push([o.x, o.y, 26]);
    }
    const birds: Bird[] = [];
    {
      const rnd = mulberry32(0xb1d5);
      const here = perches.filter((p) => Math.hypot(p[0] - 352, p[1] - 180) < 900);
      for (let i = 0; i < 18 && here.length; i++) {
        const p = here[Math.floor(rnd() * here.length)];
        birds.push({
          x: p[0], y: p[1], z: p[2], fx: p[0], fy: p[1], fz: p[2], tx: p[0], ty: p[1], tz: p[2],
          flying: false, t: 0, dur: 1, wait: 1 + rnd() * 7, col: Math.floor(rnd() * 5), face: rnd() < 0.5 ? 1 : -1,
        });
      }
    }
    const BIRD_COL = [
      ["#5d8fd8", "#f3f0e0"],
      ["#d0463b", "#f2b8a8"],
      ["#f2c94c", "#fff1a8"],
      ["#8a6a4a", "#dcc9a4"],
      ["#5fa88a", "#e6f2e0"],
    ];
    const maskCv = document.createElement("canvas"); // the night, with holes where the lights are
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
      const light: Light = lightAt(s.dayShift);
      const dark = light.dark;
      s.night = dark > 0.5;
      const timeText = light.label;
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
          act.current.toast(`You slept until ${lightAt(s.dayShift).label.replace(/^\S+\s/, "").toLowerCase()}. Cozy...`);
        }
      }
      s.busy = !!s.fade || !!s.sleep || s.cook >= 0;

      // a bird now and then, outdoors only
      birdIn -= dt;
      if (birdIn <= 0) {
        birdIn = 6 + Math.random() * 9;
        if (s.scene === "out" && !s.open) sound.play(dark < 0.45 ? "bird" : "cricket");
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
          const inHome = s.scene !== "out";
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
              sound.play(s.scene !== "out" ? "stepWood" : "step");
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

      // ---- birds, and the fireflies let out of jars ----
      if (s.scene === "out" && !reduceMotion) {
        for (const b of birds) {
          if (b.flying) {
            b.t += dt;
            const f = Math.min(1, b.t / b.dur);
            const e = f * f * (3 - 2 * f);
            b.x = b.fx + (b.tx - b.fx) * e;
            b.y = b.fy + (b.ty - b.fy) * e;
            b.z = b.fz + (b.tz - b.fz) * e + Math.sin(f * Math.PI) * 16;
            if (f >= 1) {
              b.flying = false;
              b.wait = 3 + Math.random() * 7;
            }
          } else {
            b.wait -= dt;
            const near = Math.hypot(b.x - s.x, b.y - s.y) < 46;
            if (near || b.wait <= 0) {
              const cands = perches.filter((p) => {
                const dd = Math.hypot(p[0] - b.x, p[1] - b.y);
                return dd > 40 && dd < 260 && Math.hypot(p[0] - s.x, p[1] - s.y) > 60;
              });
              if (cands.length) {
                const p = cands[Math.floor(Math.random() * cands.length)];
                b.fx = b.x;
                b.fy = b.y;
                b.fz = b.z;
                b.tx = p[0];
                b.ty = p[1];
                b.tz = p[2];
                b.flying = true;
                b.t = 0;
                b.dur = 0.8 + Math.hypot(p[0] - b.x, p[1] - b.y) / 170;
                b.face = p[0] >= b.x ? 1 : -1;
                if (near && dark < 0.5) sound.play("wing");
                else if (dark < 0.4 && Math.random() < 0.25) sound.play("bird");
              } else b.wait = 2 + Math.random() * 4;
            }
          }
        }
      }
      for (let i = s.swarm.length - 1; i >= 0; i--) {
        const f = s.swarm[i];
        if (t - f.born > f.life) {
          s.swarm.splice(i, 1);
          continue;
        }
        f.vx *= 1 - 0.5 * dt;
        f.vy *= 1 - 0.5 * dt;
        f.x += (f.vx + Math.sin(t * 1.3 + f.p * 7) * 7) * dt;
        f.y += (f.vy + Math.cos(t * 1.1 + f.p * 5) * 5 - 2) * dt;
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
          outfit: s.owner ? s.style.outfit : 0,
          hairStyle: s.owner ? s.style.hairStyle : 0,
          hairColor: s.owner ? s.style.hairColor : 0,
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
      ctx.fillStyle = s.scene !== "out" ? "#2a1b14" : "#1d3a1f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(S, 0, 0, S, -s.camX * S, -s.camY * S);

      const flyLift = (fly: boolean) => (fly ? 11 + Math.sin(t * 5) * 1.5 : 0);
      // Dancers' glows, drawn again after the night colour grade so they still shine in the dark.
      const danceGlows: { px: number; py: number; r: number; dance: boolean; age: number }[] = [];
      const flushDanceGlows = () => {
        if (!danceGlows.length) return;
        const k = Math.min(1, dark * 1.4); // how much the dark makes the glow stand out
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const d of danceGlows) {
          const r = d.r * (1 + k * 0.5);
          DANCE_HUES.forEach((hue, i) => {
            const a3 = t * 2.4 + i * Math.PI;
            const ox = Math.cos(a3) * r * 0.28;
            const oy = Math.sin(a3) * r * 0.28 * 0.55;
            ctx.save();
            ctx.translate(d.px + ox, d.py - 1 + oy);
            ctx.scale(1, 0.55);
            const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.85);
            g1.addColorStop(0, `hsla(${hue},100%,60%,${0.1 + k * 0.5})`);
            g1.addColorStop(0.6, `hsla(${hue},100%,58%,${0.04 + k * 0.24})`);
            g1.addColorStop(1, `hsla(${hue},100%,58%,0)`);
            ctx.fillStyle = g1;
            ctx.fillRect(-r, -r, r * 2, r * 2);
            ctx.restore();
            if (k > 0.05) {
              // a soft halo around the dancer as well, so the whole figure seems lit
              const hx = d.px + (i ? 4 : -4);
              const g2 = ctx.createRadialGradient(hx, d.py - 14, 0, hx, d.py - 14, 22);
              g2.addColorStop(0, `hsla(${hue},100%,65%,${0.22 * k})`);
              g2.addColorStop(1, `hsla(${hue},100%,65%,0)`);
              ctx.fillStyle = g2;
              ctx.fillRect(hx - 22, d.py - 36, 44, 44);
            }
          });
          if (d.dance) {
            // little blue and yellow lights twirling up around the dancer
            for (let i = 0; i < 8; i++) {
              const a2 = d.age * 3 + (i / 8) * Math.PI * 2;
              const rise = (d.age * 0.9 + i * 0.125) % 1;
              ctx.fillStyle = `hsla(${DANCE_HUES[i % 2]},100%,70%,${1 - rise})`;
              ctx.fillRect(Math.round(d.px + Math.cos(a2) * 11), Math.round(d.py - 4 - rise * 26), 2, 2);
            }
          }
        }
        ctx.restore();
        danceGlows.length = 0;
      };
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
        look: Style | null = null,
      ) => {
        let px = Math.round(x);
        const py = Math.round(y);
        // body actions change the facing, the step frame and the height
        let faceDir = dir;
        let row = moving ? [0, 1, 2, 1][Math.floor(walkT * 7) % 4] : 1;
        let hop = 0;
        let gown = false;
        let phase = -1; // which part of the princess dance
        let glide = 0; // sideways travel, in pixels
        let flare = 6; // how wide the gown flares
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
        } else if (action === "!waltz") {
          // a slow turn with a gentle step, like a waltz
          faceDir = [4, 5, 6, 7, 0, 1, 2, 3][Math.floor(actAge * 2.4) % 8];
          row = [0, 1, 2, 1][Math.floor(actAge * 4.5) % 4];
          hop = Math.abs(Math.sin(actAge * 3)) * 1.6;
        } else if (action === "!princess") {
          // A proper little ballet in five parts (14 seconds): a curtsy, a waltz
          // glide, pirouettes with the arms raised, two grand leaps, a final bow.
          gown = true;
          const a = actAge;
          if (a < 1.6) {
            phase = 0;
            faceDir = 4;
            row = 1;
            hop = -2.6 * Math.sin((a / 1.6) * Math.PI);
            flare = 6 + Math.sin((a / 1.6) * Math.PI) * 3;
          } else if (a < 5.6) {
            phase = 1;
            const u = a - 1.6;
            glide = Math.sin(u * 2.4) * 7;
            faceDir = Math.cos(u * 2.4) > 0 ? 2 : 6;
            row = [0, 1, 2, 1][Math.floor(u * 5) % 4];
            hop = 1 + Math.abs(Math.sin(u * 2.4)) * 2;
            flare = 6 + Math.abs(Math.sin(u * 2.4)) * 3;
          } else if (a < 10) {
            phase = 2;
            const u = a - 5.6;
            faceDir = [4, 5, 6, 7, 0, 1, 2, 3][Math.floor(u * 1.9 * 8) % 8];
            row = [0, 1, 2, 1][Math.floor(u * 6) % 4];
            hop = 2 + Math.sin(u * 3) * 1.5;
            flare = 7 + Math.abs(Math.sin(u * 5)) * 5;
          } else if (a < 12.2) {
            phase = 3;
            const f = (a - 10) / 2.2;
            faceDir = f < 0.5 ? 2 : 6;
            row = 1;
            hop = Math.abs(Math.sin(f * Math.PI * 2)) * 10;
            glide = (f < 0.5 ? -1 : 1) * Math.cos(f * Math.PI * 2) * 5;
            flare = 12;
          } else {
            phase = 4;
            const f = Math.min(1, (a - 12.2) / 1.8);
            faceDir = 4;
            row = 1;
            hop = -2.6 * Math.sin(Math.min(1, f * 1.6) * Math.PI);
            flare = 6 + Math.sin(Math.min(1, f * 1.6) * Math.PI) * 3;
          }
        }
        px += Math.round(glide);
        const lift = Math.round(flyLift(fly) + hop);
        const head = py - 30 + HEAD_TOP[kind] - lift; // y of the top of the head
        ctx.fillStyle = fly ? "rgba(53,55,56,0.2)" : "rgba(53,55,56,0.28)";
        ctx.fillRect(px - 5, py - 2, 10, 2);
        ctx.fillRect(px - 3, py - 3, 6, 1);
        // Dancing makes a glowing pool of light on the floor: a blue and a yellow
        // light that swirl around each other. A normal-blend layer shows on pale
        // floors too (a glow that only adds light vanishes on marble); the
        // additive layer after the night grade (flushDanceGlows) makes it shine.
        if (action === "!dance" || action === "!waltz" || action === "!princess") {
          const r = (action === "!dance" ? 30 : 27) * (1 + Math.sin(t * 6) * 0.1);
          ctx.save();
          ctx.translate(px, py - 1);
          ctx.scale(1, 0.55); // a pool on the floor, not a ball
          DANCE_HUES.forEach((hue, i) => {
            const a3 = t * 2.4 + i * Math.PI;
            const ox = Math.cos(a3) * r * 0.28;
            const oy = Math.sin(a3) * r * 0.28;
            const pool = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 0.85);
            pool.addColorStop(0, `hsla(${hue},95%,58%,0.55)`);
            pool.addColorStop(0.6, `hsla(${hue},95%,60%,0.25)`);
            pool.addColorStop(1, `hsla(${hue},95%,62%,0)`);
            ctx.fillStyle = pool;
            ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
          });
          ctx.restore();
          danceGlows.push({ px, py, r, dance: action === "!dance", age: actAge });
        }
        if (isSuper && fly) {
          const fw = Math.sin(t * 14) > 0 ? 6 : 4;
          ctx.fillStyle = "#fff9d6";
          ctx.fillRect(px - 7 - fw, head + 9, fw, 4);
          ctx.fillRect(px + 7, head + 9, fw, 4);
          ctx.fillStyle = "#e8c97a";
          ctx.fillRect(px - 7 - fw, head + 13, fw - 1, 1);
          ctx.fillRect(px + 7, head + 13, fw - 1, 1);
        }
        const sheetBase = art.chars[kind]?.[tint] ?? art.chars[kind]?.[0] ?? art.char;
        ctx.drawImage(
          look && kind === "farmer" ? hairSheet(sheetBase, look.hairColor) : sheetBase,
          faceDir * 16,
          row * 32,
          16,
          32,
          px - 8,
          py - 30 - lift,
          16,
          32,
        );
        if (kind === "farmer") {
          const worn = look ? OUTFITS[look.outfit] : undefined;
          if (gown) {
            // the princess dance keeps the dress she is wearing (the rose gown if she has none on)
            drawOutfit(ctx, look && look.outfit > 0 && worn ? worn : OUTFITS[1], px, py - lift, faceDir, row, actAge, false, Math.round(flare));
          } else if (look && look.outfit > 0 && worn) {
            drawOutfit(ctx, worn, px, py - lift, faceDir, row, t, moving);
          }
          if (look) drawHairExtras(ctx, px, py - lift, faceDir, row, look.hairStyle, look.hairColor, t, moving);
        }
        if (gown) {
          const base = py - lift;
          const fl = Math.round(flare);
          // the arms: holding the skirt, out for the waltz, raised for the pirouettes, wide for the leaps
          const mode = phase === 2 ? "up" : phase === 3 || phase === 1 ? "out" : "skirt";
          for (const side of [-1, 1]) {
            const sx = px + side * 4;
            const sy = base - 8;
            const ex = mode === "up" ? px + side * 3 : mode === "out" ? px + side * (phase === 3 ? 12 : 10) : px + side * (fl - 1);
            const ey = mode === "up" ? head - 3 : mode === "out" ? base - (phase === 3 ? 13 : 10) : base - 3;
            const n = Math.max(Math.abs(ex - sx), Math.abs(ey - sy), 1);
            ctx.fillStyle = "#f08cb0";
            for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(sx + ((ex - sx) * k) / n), Math.round(sy + ((ey - sy) * k) / n), 1, 1);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(ex - 1, ey - 1, 2, 2);
          }
          // the tiara, resting on the hair
          const tia = kind === "farmer" ? headAnchor(px, py - lift, faceDir, row) : { x: px, y: head - 2 };
          ctx.fillStyle = "#f6c453";
          ctx.fillRect(tia.x - 3, tia.y + 1, 7, 1);
          ctx.fillRect(tia.x - 3, tia.y, 1, 1);
          ctx.fillRect(tia.x, tia.y - 1, 1, 2);
          ctx.fillRect(tia.x + 3, tia.y, 1, 1);
          ctx.fillStyle = "#ff6fa5";
          ctx.fillRect(tia.x, tia.y - 2, 1, 1);
          // sparkles circling her (wider and faster during the pirouettes and leaps)
          const orbit = phase === 2 || phase === 3 ? 1.6 : 1;
          for (let i = 0; i < 10; i++) {
            const a = actAge * 2.2 * orbit + (i / 10) * Math.PI * 2;
            const sx = Math.round(px + Math.cos(a) * ((13 + Math.sin(actAge * 3 + i) * 2) * orbit));
            const sy = Math.round(base - 14 + Math.sin(a) * 9 * orbit);
            const tw = Math.sin(actAge * 9 + i * 2) > 0;
            ctx.fillStyle = i % 2 ? "rgba(255,224,120,0.95)" : "rgba(255,170,205,0.95)";
            ctx.fillRect(sx, sy, tw ? 2 : 1, tw ? 2 : 1);
          }
          // rose petals drifting down all through the dance
          for (let i = 0; i < 12; i++) {
            const pp = (actAge * 0.45 + i * 0.37) % 1;
            const sx = Math.round(px + Math.sin(actAge * 1.6 + i * 2.1) * 17);
            const sy = Math.round(head - 8 + pp * 38);
            ctx.fillStyle = i % 3 ? `rgba(255,150,185,${1 - pp * 0.6})` : `rgba(255,240,245,${1 - pp * 0.6})`;
            ctx.fillRect(sx, sy, 2, 1);
            ctx.fillRect(sx + (i % 2), sy + 1, 1, 1);
          }
          // hearts float up, and burst at the final bow
          const hearts = phase === 4 ? 5 : 2;
          for (let i = 0; i < hearts; i++) {
            const ha = (actAge * (phase === 4 ? 1.6 : 0.9) + i * (1 / hearts)) % 1;
            const hx = Math.round(px + (i - (hearts - 1) / 2) * 7 + Math.sin(actAge * 2 + i) * 2);
            const hy = Math.round(head - 4 - ha * 20);
            ctx.fillStyle = `rgba(255,105,150,${1 - ha})`;
            ctx.fillRect(hx, hy, 2, 1);
            ctx.fillRect(hx + 3, hy, 2, 1);
            ctx.fillRect(hx, hy + 1, 5, 1);
            ctx.fillRect(hx + 1, hy + 2, 3, 1);
            ctx.fillRect(hx + 2, hy + 3, 1, 1);
          }
        }
        if (isOwner && !gown) {
          // Sheza wears a little flower crown
          if (kind === "farmer") {
            drawFlowerCrown(ctx, px, py - lift, faceDir, row);
          } else {
            const crown = ["#f29ab6", "#f6c453", "#f29ab6", "#f6c453", "#f29ab6"];
            crown.forEach((col, i) => {
              ctx.fillStyle = col;
              ctx.fillRect(px - 5 + i * 2, head - 1, 2, 2);
            });
            ctx.fillStyle = "#78a158";
            ctx.fillRect(px - 6, head, 1, 1);
            ctx.fillRect(px + 5, head, 1, 1);
          }
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
      if (!(s.scene === "bedroom" && s.sleep)) {
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
              s.owner && myKind === "farmer" ? s.style : null,
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
              r.owner && !r.admin && (isKind(r.kind) ? r.kind : "farmer") === "farmer"
                ? { outfit: r.outfit, hairStyle: r.hairStyle, hairColor: r.hairColor }
                : null,
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

      if (s.scene !== "out") {
        const hs: RoomDrawState = {
          night: s.night,
          light,
          cook: s.cook,
          dish: s.dish,
          sleeping: !!s.sleep,
          heartT: s.heartT,
          x: s.x,
          y: s.y,
          tv: s.tv,
        };
        drawRoomScene(ctx, art, paintedBgs.current[s.scene as RoomId] ?? roomBgs[s.scene as RoomId], s.scene, W, hs, t, actors);
        flushDanceGlows(); // after the room's darkness, so dancers still glow

        // screen-space: the label of whatever you are at
        ctx.setTransform(1, 0, 0, 1, 0, 0);
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
        if (o.key === "home") {
          // golden light on the palace: glowing windows and door, twinkling fairy lights
          const left = Math.round(o.x - cv.width / 2);
          const top = Math.round(o.y - cv.height);
          const beat = reduceMotion ? 1 : 1 + Math.sin(t * 2.2) * 0.1;
          ctx.globalCompositeOperation = "lighter";
          for (const [gx, gy, gr, ga] of [
            [36, 53, 13, 0.5],
            [70, 53, 13, 0.5],
            [52, 92, 22, 0.4],
          ] as const) {
            const g = ctx.createRadialGradient(left + gx, top + gy, 0, left + gx, top + gy, gr * beat);
            g.addColorStop(0, `rgba(255,214,90,${ga * (1 - dark * 0.45)})`);
            g.addColorStop(1, "rgba(255,214,90,0)");
            ctx.fillStyle = g;
            ctx.fillRect(left + gx - gr * 1.2, top + gy - gr * 1.2, gr * 2.4, gr * 2.4);
          }
          ctx.globalCompositeOperation = "source-over";
          for (let i = 0; i < 14; i++) {
            const lx = left + 6 + i * 6.6;
            const ly = top + 70 + Math.sin(i * 0.9) * 2 + (i % 2) * 2;
            const on = reduceMotion || Math.sin(t * 3 + i * 1.7) > -0.2;
            ctx.fillStyle = on ? "#fff6b0" : "#c9a95a";
            ctx.fillRect(Math.round(lx), Math.round(ly), 2, 2);
            if (on) {
              ctx.fillStyle = "rgba(255,230,120,0.25)";
              ctx.fillRect(Math.round(lx) - 1, Math.round(ly) - 1, 4, 4);
            }
          }
          if (!reduceMotion)
            for (let i = 0; i < 7; i++) {
              const age = (t * 0.6 + i * 0.37) % 1;
              ctx.fillStyle = `rgba(255,240,160,${1 - age})`;
              const sx = left + 8 + ((i * 53) % 90);
              ctx.fillRect(Math.round(sx), Math.round(top + 20 - age * 16), 1 + (i % 2), 1 + (i % 2));
            }
        }
        if (o.key === "sorryBoard" || o.key === "kindBoard") {
          const wide = o.key === "sorryBoard";
          drawBoardText(
            ctx,
            family,
            boardsRef.current[wide ? "sorry" : "kind"],
            Math.round(o.x),
            Math.round(o.y - cv.height),
            wide,
          );
        }
      }
      while (ai < actors.length) actors[ai++].draw();

      // birds (asleep at night)
      if (s.scene === "out" && dark < 0.6) {
        for (const b of birds) {
          if (!inView({ x: b.x, y: b.y })) continue;
          const [c1, c2] = BIRD_COL[b.col];
          const bx = Math.round(b.x);
          const by = Math.round(b.y - b.z);
          const fc = b.face;
          if (b.flying) {
            ctx.fillStyle = "rgba(0,0,0,0.18)";
            ctx.fillRect(bx - 2, Math.round(b.y) - 1, 4, 1);
          }
          ctx.fillStyle = "#3a2a22";
          ctx.fillRect(bx - fc * 4, by - 2, 2, 1); // tail
          ctx.fillStyle = c1;
          ctx.fillRect(bx - 2, by - 3, 5, 3); // body
          ctx.fillRect(bx + (fc > 0 ? 2 : -3), by - 5, 2, 2); // head
          ctx.fillStyle = c2;
          ctx.fillRect(bx - 1, by - 1, 3, 1); // belly
          ctx.fillStyle = "#f09a3a";
          ctx.fillRect(bx + (fc > 0 ? 4 : -4), by - 4, 1, 1); // beak
          ctx.fillStyle = "#1b1b24";
          ctx.fillRect(bx + (fc > 0 ? 3 : -3), by - 5, 1, 1); // eye
          ctx.fillStyle = c1;
          if (b.flying) {
            const up = Math.floor(t * 16 + b.x) % 2;
            ctx.fillRect(bx - 1, by - 4 - (up ? 2 : 0), 3, 2 + (up ? 0 : 0));
            ctx.fillStyle = c2;
            ctx.fillRect(bx, by - 5 - (up ? 2 : -1), 2, 1);
          } else {
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(bx - 1, by - 3, 2, 2);
          }
        }
      }

      // "!" over unread posts
      const bob = Math.round(Math.sin(t * 4) * 1.5);
      for (const it of world.interacts) {
        if (it.kind !== "post" || s.read.has(it.id) || !inView({ x: it.signX, y: it.signY })) continue;
        ctx.drawImage(art.sprites.exclaim as HTMLCanvasElement, Math.round(it.signX - 4), Math.round(it.signY - 48 + bob));
      }

      // time of day: grade the whole picture. By dusk and night the colour
      // tint is a multiply layer with holes where lamps, windows and fires
      // shine, so lit places keep their warm colours while the rest goes
      // deep, saturated blue.
      {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const cw = canvas.width;
        const chh = canvas.height;
        const mult = `rgb(${Math.round(light.mult[0])},${Math.round(light.mult[1])},${Math.round(light.mult[2])})`;
        const dim = light.mult[0] + light.mult[1] + light.mult[2] < 760;
        const pools: [number, number, number, number, string][] = []; // screen x, y, radius, hole, colour
        const ramp = Math.min(1, Math.max(0, (dark - 0.25) / 0.5)); // lights matter from dusk
        if (ramp > 0.02) {
          const pool = (wx: number, wy: number, r: number, hole: number, col: string) =>
            pools.push([(wx - s.camX) * S, (wy - s.camY) * S, r * S, hole, col]);
          for (const o of vis) {
            if (o.key === "lamp") pool(o.x, o.y - 30, 40, 1, "255,208,90");
            else if (o.key === "campfire") pool(o.x, o.y - 8, 54, 1, "255,176,60");
            else if (o.key === "jukebox") pool(o.x, o.y - 14, 24, 0.9, "255,204,90");
            else if (o.key === "stall") pool(o.x, o.y - 18, 28, 0.9, "255,206,110");
            else if (o.key === "well") pool(o.x, o.y - 12, 20, 0.7, "255,204,90");
            else if (o.key === "jar" && (s.jars[o.interact ?? ""] ?? 0) < performance.now())
              pool(o.x, o.y - (o.lift ?? 0) - 7, 16, 1, "255,214,100");
            else if (o.key === "home") {
              const left = o.x - 52;
              const top = o.y - 108;
              pool(left + 36, top + 53, 17, 1, "255,206,96");
              pool(left + 70, top + 53, 17, 1, "255,206,96");
              pool(left + 52, top + 92, 28, 1, "255,190,80");
            } else if (o.key.startsWith("house")) pool(o.x, o.y - 18, 20, 0.95, "255,200,100");
          }
          if (maskCv.width !== cw || maskCv.height !== chh) {
            maskCv.width = cw;
            maskCv.height = chh;
          }
          const mctx = maskCv.getContext("2d")!;
          mctx.globalCompositeOperation = "source-over";
          mctx.clearRect(0, 0, cw, chh);
          mctx.fillStyle = mult;
          mctx.fillRect(0, 0, cw, chh);
          mctx.globalCompositeOperation = "destination-out";
          for (const [px, py, pr, ph] of pools) {
            const g = mctx.createRadialGradient(px, py, 0, px, py, pr);
            g.addColorStop(0, `rgba(0,0,0,${ph * ramp})`);
            g.addColorStop(0.6, `rgba(0,0,0,${ph * ramp * 0.75})`);
            g.addColorStop(1, "rgba(0,0,0,0)");
            mctx.fillStyle = g;
            mctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
          }
          mctx.globalCompositeOperation = "source-over";
          ctx.globalCompositeOperation = "multiply";
          ctx.drawImage(maskCv, 0, 0);
          ctx.globalCompositeOperation = "source-over";
        } else if (dim) {
          ctx.globalCompositeOperation = "multiply";
          ctx.fillStyle = mult;
          ctx.fillRect(0, 0, cw, chh);
          ctx.globalCompositeOperation = "source-over";
        }
        const [ar, ag, ab, aa] = light.add;
        if (aa > 0.005) {
          const wash = ctx.createLinearGradient(0, 0, 0, chh);
          wash.addColorStop(0, `rgba(${Math.round(ar)},${Math.round(ag * 0.85)},${Math.min(255, Math.round(ab + 25))},${aa * 1.5})`);
          wash.addColorStop(1, `rgba(${Math.round(ar)},${Math.round(ag)},${Math.round(ab)},${aa * 0.5})`);
          ctx.fillStyle = wash;
          ctx.fillRect(0, 0, cw, chh);
        }
        if (dark > 0.2) {
          // richer colour and deeper shadows, like a night lit by a few warm windows
          ctx.globalCompositeOperation = "overlay";
          ctx.fillStyle = `rgba(30,50,255,${0.32 * dark})`;
          ctx.fillRect(0, 0, cw, chh);
          ctx.globalCompositeOperation = "source-over";
        }
        // soft shafts of light in the morning and at sunset, cloud shadows at noon
        if (!reduceMotion) {
          if (light.period === "morning" || light.period === "sunset") {
            const rgb = light.period === "morning" ? "255,236,180" : "255,150,90";
            for (let i = 0; i < 4; i++) {
              const x0 = (i * 0.27 + 0.04 + Math.sin(t * 0.12 + i) * 0.02) * cw;
              const a = (0.05 + 0.025 * Math.sin(t * 0.5 + i * 1.7)) * (light.period === "sunset" ? 1.5 : 1);
              ctx.fillStyle = `rgba(${rgb},${a})`;
              ctx.beginPath();
              ctx.moveTo(x0, 0);
              ctx.lineTo(x0 + 0.1 * cw, 0);
              ctx.lineTo(x0 + 0.1 * cw + 0.35 * chh, chh);
              ctx.lineTo(x0 + 0.35 * chh - 0.02 * cw, chh);
              ctx.closePath();
              ctx.fill();
            }
          } else if (light.period === "noon") {
            ctx.fillStyle = "rgba(20,50,30,0.06)";
            for (let i = 0; i < 3; i++) {
              const cx = ((t * 9 + i * 330) % (world.w + 500)) - 250;
              const cy = 260 + i * 520 + Math.sin(i * 3) * 80;
              ctx.beginPath();
              ctx.ellipse((cx - s.camX) * S, (cy - s.camY) * S, 90 * S, 36 * S, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        // the colour of each light is laid over its pool (so a lamp looks amber,
        // the campfire orange, the jukebox pink), with only a tiny glow on the
        // light itself
        if (pools.length) {
          ctx.globalCompositeOperation = "overlay";
          for (const [px, py, pr, , col] of pools) {
            const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
            g.addColorStop(0, `rgba(${col},${0.85 * ramp})`);
            g.addColorStop(0.7, `rgba(${col},${0.35 * ramp})`);
            g.addColorStop(1, `rgba(${col},0)`);
            ctx.fillStyle = g;
            ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
          }
          ctx.globalCompositeOperation = "lighter";
          for (const [px, py, pr, , col] of pools) {
            const r = pr * 0.22;
            const g = ctx.createRadialGradient(px, py, 0, px, py, r);
            g.addColorStop(0, `rgba(${col},${0.32 * ramp})`);
            g.addColorStop(1, `rgba(${col},0)`);
            ctx.fillStyle = g;
            ctx.fillRect(px - r, py - r, r * 2, r * 2);
          }
          ctx.globalCompositeOperation = "source-over";
        }
      }

      // emissive things go on after the grade: fairy lights and fireflies
      ctx.setTransform(S, 0, 0, S, -s.camX * S, -s.camY * S);
      flushDanceGlows();
      // golden fairy lights along the home street: strings between the lamp
      // posts, a row along each house eave, and a warm glow round every lamp
      if (s.scene === "out" && s.camY < 200 && s.camY + vh > 80) {
        const BULBS = [
          ["#fff3a8", "255,230,130"],
          ["#ffe27a", "255,214,100"],
          ["#fff6c4", "255,236,150"],
          ["#ffd96a", "255,204,90"],
        ];
        const bulb = (bx: number, by: number, i: number) => {
          const on = reduceMotion || Math.sin(t * 2.6 + i * 1.3) > -0.35;
          const night = dark > 0.35;
          const [core, halo] = night ? BULBS[((i % 4) + 4) % 4] : BULBS[0];
          ctx.fillStyle = on ? core : "#8a6f3a";
          ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
          if (on) {
            ctx.fillStyle = `rgba(${halo},${night ? 0.45 : 0.2})`;
            ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 4, 4);
            if (night) {
              ctx.fillStyle = `rgba(${halo},0.16)`;
              ctx.fillRect(Math.round(bx) - 3, Math.round(by) - 3, 8, 8);
            }
          }
        };
        const string = (x0: number, x1: number, y: number, sag: number, seed: number) => {
          const n = Math.max(2, Math.round((x1 - x0) / 6));
          let px = x0;
          let py = y;
          for (let i = 0; i <= n; i++) {
            const f = i / n;
            const bx = x0 + (x1 - x0) * f;
            const by = y + Math.sin(f * Math.PI) * sag;
            ctx.fillStyle = "rgba(120,86,30,0.75)";
            const steps = Math.max(1, Math.round(Math.abs(bx - px)));
            for (let k = 0; k < steps; k++) {
              ctx.fillRect(
                Math.round(px + ((bx - px) * k) / steps),
                Math.round(py + ((by - py) * k) / steps),
                1,
                1,
              );
            }
            px = bx;
            py = by;
            if (i > 0 && i < n) bulb(bx - 1, by, i + seed);
          }
        };
        const lampX = [7, 13, 19, 25, 31, 37].map((c) => c * T + 8);
        for (let i = 0; i < lampX.length - 1; i++) string(lampX[i], lampX[i + 1], 112, 8, i * 5);
        for (const hc of [10, 16, 28, 34]) string(hc * T - 24, hc * T + 24, 100, 4, hc);
        ctx.globalCompositeOperation = "lighter";
        for (const lx of lampX) {
          const gr = 15;
          const g = ctx.createRadialGradient(lx, 112, 0, lx, 112, gr);
          g.addColorStop(0, `rgba(255,214,90,${0.34 - dark * 0.14})`);
          g.addColorStop(1, "rgba(255,214,90,0)");
          ctx.fillStyle = g;
          ctx.fillRect(lx - gr, 112 - gr, gr * 2, gr * 2);
        }
        ctx.globalCompositeOperation = "source-over";
      }

      // fireflies over the grass (only the ones on screen); drawn after the
      // night colour grade so they stay bright and keep their colours
      const FLY = ["255,208,70", "255,224,100", "255,196,60"];
      for (const f of reduceMotion ? [] : flies) {
        if (f.x < s.camX - 12 || f.x > s.camX + vw + 12 || f.y < s.camY - 12 || f.y > s.camY + vh + 12) continue;
        const a = Math.max(0, Math.sin(t * 1.7 + f.p * 3));
        const glow = Math.min(1, (0.25 + 0.75 * a * a) * (0.6 + dark * 1.1));
        const col = FLY[Math.floor(f.p * 10) % 3];
        const fx = Math.round(f.x + Math.sin(t * 0.6 + f.p) * 9);
        const fy = Math.round(f.y + Math.cos(t * 0.8 + f.p * 1.3) * 6 - 6);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = `rgba(${col},${(0.1 + dark * 0.12) * glow})`;
        ctx.fillRect(fx - 3, fy - 3, 7, 7);
        ctx.fillStyle = `rgba(${col},${(0.28 + dark * 0.3) * glow})`;
        ctx.fillRect(fx - 1, fy - 2, 3, 5);
        ctx.fillRect(fx - 2, fy - 1, 5, 3);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(255,246,170,${0.5 + 0.5 * glow})`;
        ctx.fillRect(fx - 1, fy - 1, 2, 2);
      }

      // jars of fireflies and the fireflies let out of them
      if (s.scene === "out") {
        const nowMs = performance.now();
        ctx.globalCompositeOperation = "lighter";
        for (const o of vis) {
          if (o.key !== "jar" || (s.jars[o.interact ?? ""] ?? 0) > nowMs) continue;
          const jx = Math.round(o.x);
          const jy = Math.round(o.y - (o.lift ?? 0));
          const g = ctx.createRadialGradient(jx, jy - 8, 0, jx, jy - 8, 11);
          g.addColorStop(0, `rgba(255,214,100,${0.16 + dark * 0.2})`);
          g.addColorStop(1, "rgba(255,214,100,0)");
          ctx.fillStyle = g;
          ctx.fillRect(jx - 11, jy - 19, 22, 22);
          for (let i = 0; i < 5; i++) {
            const on = reduceMotion || Math.sin(t * 2.2 + i * 1.9 + o.x) > -0.5;
            const dx = Math.round(Math.sin(t * 0.8 + i * 2 + o.x) * 2 + (i - 2) * 0.8);
            const dy = Math.round(-8 + Math.cos(t * 0.7 + i * 1.7) * 2.5);
            ctx.fillStyle = on ? "rgba(255,236,120,1)" : "rgba(255,200,80,0.35)";
            ctx.fillRect(jx + dx, jy + dy, 2, 2);
            if (on) {
              ctx.fillStyle = "rgba(255,210,90,0.35)";
              ctx.fillRect(jx + dx - 1, jy + dy - 1, 3, 3);
            }
          }
        }
        for (const f of s.swarm) {
          const age = t - f.born;
          const a = Math.max(0, Math.min(1, (f.life - age) / 4, age / 0.4 + 0.2)) * (0.55 + 0.45 * Math.sin(t * 3 + f.p * 5));
          const fx = Math.round(f.x);
          const fy = Math.round(f.y);
          ctx.fillStyle = `rgba(255,206,70,${(0.16 + dark * 0.14) * a})`;
          ctx.fillRect(fx - 3, fy - 3, 7, 7);
          ctx.fillStyle = `rgba(255,224,100,${(0.4 + dark * 0.3) * a})`;
          ctx.fillRect(fx - 1, fy - 2, 3, 5);
          ctx.fillRect(fx - 2, fy - 1, 5, 3);
          ctx.fillStyle = `rgba(255,250,200,${0.9 * a})`;
          ctx.fillRect(fx - 1, fy - 1, 2, 2);
        }
        ctx.globalCompositeOperation = "source-over";
      }

      // ---- screen-space labels ----
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const it of world.interacts) {
        if (it.id.startsWith("jar:") && it.id !== s.near) continue;
        if (!inView({ x: it.signX, y: it.signY })) continue;
        // (the edit tag of a notice board sits just under it, so it never covers the words)
        const lift = it.kind === "post" ? 36 : it.id.startsWith("board:") ? -22 : BIG.has(it.id) ? 70 : 34;
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
      const k = (e.key ?? "").toLowerCase();
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
      } else if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(k)) {
        const n = Number(k) - 1;
        act.current.emote(n < 4 ? QUICK[n] : (ACTIONS[n - 4]?.k ?? ""));
      } else if ((k === "enter" || k === "e" || k === " ") && g.current.near) {
        if (t?.tagName === "BUTTON" || t?.tagName === "A") return;
        e.preventDefault();
        act.current.activate(g.current.near);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      g.current.keys.delete((e.key ?? "").toLowerCase());
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
    if (s.hang && s.scene !== "out" && wy < WALL_BOTTOM) {
      const room = s.scene as RoomId;
      const { data, id } = s.hang;
      void putPainting({ id, room, x: clampX(wx - FRAME_W / 2), y: clampY(wy - FRAME_H / 2), data }).then((err) => {
        if (err) showToast(err);
        else {
          cancelHanging();
          showToast("🖼 Hung! Everyone can see it.");
        }
      });
      return;
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
        {admin && <span>👑 Fox (superadmin)</span>}
        {owner && <span>🌸 Sheza (owner)</span>}
      </div>

      {DAY_NIGHT_ENABLED && !gate && (
        <button
          type="button"
          className="g-time"
          title="Jump to the next part of the day"
          onClick={() => {
            const s = g.current;
            s.dayShift += nextPeriodSeconds(s.dayShift);
            sound.play("click");
          }}
        >
          {timeLabel}
        </button>
      )}

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
        className={`g-map${scene !== "out" ? " g-map-off" : ""}${admin ? " g-map-tp" : ""}`}
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

      {cookIdx !== null && RECIPES[cookIdx] && (
        <CookingGame
          key={cookIdx}
          recipe={RECIPES[cookIdx]}
          onFinish={finishCooking}
          onCancel={cancelCooking}
          onSound={playSound}
        />
      )}

      {libraryOpen && <Library onClose={() => closePopup(() => setLibraryOpen(false))} onSound={playSound} />}
      {fishing && <FishingGame onClose={() => closePopup(() => setFishing(false))} onSound={playSound} />}
      {tvOpen && (
        <TvModal
          channel={tvChannel}
          onChannel={changeChannel}
          onClose={() => closePopup(() => setTvOpen(false))}
          onSound={playSound}
        />
      )}
      {wardrobe && assets && (
        <Wardrobe
          art={assets.art}
          tint={wardrobe.tint}
          value={style}
          startTab={wardrobe.tab}
          onChange={(st) => {
            g.current.style = st;
            setStyle(st);
            saveStyle(st);
          }}
          onClose={() => closePopup(() => setWardrobe(null))}
        />
      )}
      {pianoOpen && <PianoModal onClose={() => closePopup(() => setPianoOpen(false))} />}
      {studyOpen && <StudyDesk onClose={() => closePopup(() => setStudyOpen(false))} onSound={playSound} />}
      {easelOpen && (
        <Easel
          gallery={gallery}
          onHang={startHanging}
          onShowroom={hangInShowroom}
          onRemove={takeDown}
          onClose={() => closePopup(() => setEaselOpen(false))}
          onSound={playSound}
        />
      )}
      {hang && (
        <div className="g-hangbar" role="status">
          <p>
            🖼 {scene === "out"
              ? "Go inside the palace, then click a wall to hang your painting."
              : "Click a wall to hang your painting here, or walk to another room first."}
          </p>
          <button type="button" className="g-gate-btn" onClick={() => void hangInShowroom(hang.data, hang.id).then((e) => e && showToast(e))}>
            🏛 Showroom instead
          </button>
          <button type="button" className="g-gate-btn" onClick={cancelHanging}>
            Cancel
          </button>
        </div>
      )}
      {editBoard && (
        <BoardEditor
          id={editBoard}
          value={boards[editBoard]}
          onSaved={(b) => {
            setBoards((prev) => ({ ...prev, [editBoard]: b }));
            closePopup(() => setEditBoard(null));
            showToast("Board updated!");
          }}
          onClose={() => closePopup(() => setEditBoard(null))}
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
      <section className="sr-only" aria-label="Notes at the start of the town">
        <p>{boards.sorry.lines.join(" ")}</p>
        <p>{boards.kind.lines.join(" ")}</p>
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
            <CanAdminContext.Provider value={canAdmin}>{nodes[openKey]}</CanAdminContext.Provider>
          )}
        </PostModal>
      )}
    </div>
  );
}
