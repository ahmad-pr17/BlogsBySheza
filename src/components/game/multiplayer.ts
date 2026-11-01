import { cleanRemoteMessage, cleanRemoteName } from "@/components/game/names";

// Realtime town: everyone who is in the game sees the others walking around.
// Uses Ably (channel "town"). The browser authenticates with short-lived tokens
// from /api/realtime/token; if that is not configured the game just runs solo.
//
// Nothing is stored: positions are broadcast only while a visitor is online.

export type Scene = "out" | "home";

export type Remote = {
  id: string; // Ably clientId
  name: string;
  admin: boolean; // the superadmin (the fox)
  owner: boolean; // Sheza, the blog's owner
  kind: string; // which character (see characters.ts)
  tint: number; // farmer shirt colour
  x: number;
  y: number;
  tx: number; // target position from the network
  ty: number;
  dir: number;
  moving: boolean;
  fly: boolean;
  scene: Scene;
  seen: number; // ms timestamp of the last update
  walkT: number;
  emote: string | null;
  emoteAt: number;
  act: string | null; // body action: !dance, !jump or !spin
  actAt: number;
  say: string | null; // last chat message
  sayAt: number;
};

export type MpState = {
  x: number;
  y: number;
  dir: number;
  moving: boolean;
  fly: boolean;
  scene: Scene;
};

export type Multiplayer = {
  remotes: Map<string, Remote>;
  update: (dt: number) => void; // smooth the remotes toward their targets
  send: (s: MpState) => void; // call every frame; throttled inside
  emote: (kind: string) => void;
  say: (text: string) => void;
  close: () => void;
};

const ADJ = ["Sleepy", "Happy", "Cozy", "Sunny", "Gentle", "Brave", "Quiet", "Merry", "Dreamy", "Kind"];

export function randomName(label: string) {
  const r = (n: number) => Math.floor(Math.random() * n);
  return `${ADJ[r(ADJ.length)]} ${label} ${10 + r(90)}`;
}

// Body actions a character can do, and how long each lasts (seconds).
export const ACTION_SECONDS: Record<string, number> = { "!dance": 3, "!jump": 0.7, "!spin": 1.2 };
const ACTIONS = new Set(Object.keys(ACTION_SECONDS));

export const TINTS = 3; // farmer shirt colours: the two visitor ones plus Sheza's pink

export function connectMultiplayer(opts: {
  id: string;
  name: string;
  kind: string;
  tint: number;
  role: "super" | "owner" | "visitor";
  onCount: (n: number) => void;
}): Multiplayer {
  const remotes = new Map<string, Remote>();
  const meta = new Map<string, { name: string; kind: string; tint: number }>();
  const members = new Set<string>();
  let closed = false;
  let realtime: import("ably").Realtime | null = null;
  let channel: import("ably").RealtimeChannel | null = null;
  let lastSent = 0;
  let lastKey = "";

  const upsert = (cid: string): Remote => {
    let r = remotes.get(cid);
    if (!r) {
      const m = meta.get(cid);
      r = {
        id: cid,
        name: cid.startsWith("admin:") ? "Fox" : cid.startsWith("owner:") ? "Sheza" : (m?.name ?? "Visitor"),
        admin: cid.startsWith("admin:"),
        owner: cid.startsWith("owner:"),
        kind: m?.kind ?? "farmer",
        tint: m?.tint ?? 0,
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
        dir: 4,
        moving: false,
        fly: false,
        scene: "out",
        seen: Date.now(),
        walkT: 0,
        emote: null,
        emoteAt: 0,
        act: null,
        actAt: 0,
        say: null,
        sayAt: 0,
      };
      remotes.set(cid, r);
    }
    return r;
  };

  const countNow = () => opts.onCount(members.size + 1);

  (async () => {
    try {
      const mod = await import("ably");
      const Ably = mod.default ?? mod;
      if (closed) return;
      realtime = new Ably.Realtime({
        authUrl: `/api/realtime/token?id=${encodeURIComponent(opts.id)}&role=${opts.role}`,
        closeOnUnload: true,
      });
      channel = realtime.channels.get("town");
      const me = () => realtime?.auth.clientId;

      await channel.subscribe("p", (msg) => {
        const cid = msg.clientId;
        if (!cid || cid === me()) return;
        const d = msg.data as { x: number; y: number; d: number; m: number; f: number; s: number };
        if (typeof d?.x !== "number" || typeof d?.y !== "number") return;
        const r = upsert(cid);
        r.tx = d.x;
        r.ty = d.y;
        if (r.x === 0 && r.y === 0) {
          r.x = d.x;
          r.y = d.y;
        }
        r.dir = typeof d.d === "number" ? d.d : r.dir;
        r.moving = d.m === 1;
        r.fly = d.f === 1;
        r.scene = d.s === 1 ? "home" : "out";
        r.seen = Date.now();
      });

      await channel.subscribe("e", (msg) => {
        const cid = msg.clientId;
        if (!cid || cid === me()) return;
        const k = (msg.data as { k?: string })?.k;
        if (typeof k !== "string") return;
        const r = upsert(cid);
        if (k.startsWith("!")) {
          if (!ACTIONS.has(k)) return;
          r.act = k;
          r.actAt = Date.now();
        } else if (k.length <= 4) {
          r.emote = k;
          r.emoteAt = Date.now();
        }
      });

      await channel.subscribe("m", (msg) => {
        const cid = msg.clientId;
        if (!cid || cid === me()) return;
        const text = cleanRemoteMessage((msg.data as { t?: string })?.t);
        if (!text) return;
        const r = upsert(cid);
        if (Date.now() - r.sayAt < 800) return; // ignore floods
        r.say = text;
        r.sayAt = Date.now();
      });

      const onPresence = (m: import("ably").PresenceMessage) => {
        const cid = m.clientId;
        if (!cid || cid === me()) return;
        if (m.action === "leave" || m.action === "absent") {
          members.delete(cid);
          remotes.delete(cid);
          meta.delete(cid);
        } else {
          members.add(cid);
          const data = m.data as { name?: string; kind?: string; tint?: number } | undefined;
          const name = cid.startsWith("admin:")
            ? "Fox"
            : cid.startsWith("owner:")
              ? "Sheza"
              : cleanRemoteName(data?.name);
          const kind = ["farmer", "bear", "bunny", "frog", "chicken"].includes(String(data?.kind))
            ? String(data?.kind)
            : "farmer";
          const tint = Math.abs(Number(data?.tint ?? 0)) % TINTS;
          meta.set(cid, { name, kind, tint });
          const r = remotes.get(cid);
          if (r) {
            r.name = name;
            r.kind = kind;
            r.tint = tint;
          }
        }
        countNow();
      };
      await channel.presence.subscribe(onPresence);
      await channel.presence.enter({ name: opts.name, kind: opts.kind, tint: opts.tint });
      const present = await channel.presence.get();
      for (const m of present) onPresence(m);
      countNow();
    } catch {
      /* multiplayer unavailable: stay solo */
    }
  })();

  const connected = () => realtime?.connection.state === "connected" && !!channel;

  return {
    remotes,
    update(dt) {
      const now = Date.now();
      for (const [cid, r] of remotes) {
        if (now - r.seen > 15000) {
          remotes.delete(cid);
          continue;
        }
        const k = Math.min(1, dt * 9);
        r.x += (r.tx - r.x) * k;
        r.y += (r.ty - r.y) * k;
        if (r.moving) {
          r.walkT += dt;
          r.act = null; // walking cancels dancing, jumping and spinning
        }
        if (r.emote && now - r.emoteAt > 2600) r.emote = null;
      }
    },
    send(s) {
      if (!connected()) return;
      const now = performance.now();
      const key = `${Math.round(s.x)},${Math.round(s.y)},${s.dir},${s.moving ? 1 : 0},${s.fly ? 1 : 0},${s.scene}`;
      const changed = key !== lastKey;
      // while moving: about 8 updates a second; idle: a heartbeat every 4s
      if (changed ? now - lastSent < 120 : now - lastSent < 4000) return;
      lastSent = now;
      lastKey = key;
      channel!
        .publish("p", {
          x: Math.round(s.x),
          y: Math.round(s.y),
          d: s.dir,
          m: s.moving ? 1 : 0,
          f: s.fly ? 1 : 0,
          s: s.scene === "home" ? 1 : 0,
        })
        .catch(() => {});
    },
    emote(kind) {
      if (!connected()) return;
      channel!.publish("e", { k: kind }).catch(() => {});
    },
    say(text) {
      if (!connected()) return;
      channel!.publish("m", { t: text }).catch(() => {});
    },
    close() {
      closed = true;
      try {
        realtime?.close();
      } catch {
        /* ignore */
      }
      remotes.clear();
    },
  };
}
