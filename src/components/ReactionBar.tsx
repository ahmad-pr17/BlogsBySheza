"use client";

import { useEffect, useState } from "react";
import {
  REACTION_EMOJIS,
  type ReactionCounts as Counts,
  type ReactionEmoji,
} from "@/lib/reactions";

// Remembers, per browser, which emoji this visitor has picked on this post, so
// the reactions stay highlighted and a second click removes the vote.
function storageKey(postId: string) {
  return `reactions:${postId}`;
}

function readMine(postId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(postId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function ReactionBar({
  postId,
  initial,
}: {
  postId: string;
  initial: Counts;
}) {
  const [counts, setCounts] = useState<Counts>(initial);
  // Start empty so server and first client render match; hydrate the visitor's
  // saved picks from localStorage once, after mount. Seeding state from an
  // external store on mount is a legitimate effect use here.
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  // Which emoji is mid tap-animation (cleared on animation end).
  const [popping, setPopping] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of localStorage after mount
    setMine(readMine(postId));
  }, [postId]);

  async function toggle(emoji: ReactionEmoji) {
    if (pending) return;
    // Tap feedback, independent of the network round-trip. Cleared by a timeout
    // (not only onAnimationEnd) so a missed animation event can't leave the pop
    // class stuck — which would stop the same emoji re-popping on the next tap.
    setPopping(emoji);
    window.setTimeout(
      () => setPopping((p) => (p === emoji ? null : p)),
      260,
    );
    const has = mine.has(emoji);
    const op = has ? "remove" : "add";

    // Optimistic update.
    const nextMine = new Set(mine);
    if (has) nextMine.delete(emoji);
    else nextMine.add(emoji);
    setMine(nextMine);
    setCounts((c) => ({
      ...c,
      [emoji]: Math.max(0, c[emoji] + (has ? -1 : 1)),
    }));
    setPending(emoji);

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, emoji, op }),
      });
      if (!res.ok) throw new Error();
      const data: { counts: Counts } = await res.json();
      setCounts(data.counts);
      try {
        localStorage.setItem(
          storageKey(postId),
          JSON.stringify([...nextMine]),
        );
      } catch {
        /* localStorage unavailable — highlight just won't persist */
      }
    } catch {
      // Roll back on failure.
      setMine(mine);
      setCounts((c) => ({
        ...c,
        [emoji]: Math.max(0, c[emoji] + (has ? 1 : -1)),
      }));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTION_EMOJIS.map((emoji) => {
        const active = mine.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            aria-pressed={active}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition"
            style={{
              background: active ? "var(--menu-bar)" : "var(--parchment-hi)",
              border: `2px solid ${active ? "var(--wood-dark)" : "var(--wood)"}`,
              color: "var(--ink)",
            }}
          >
            <span
              className={`inline-block text-base leading-none ${
                popping === emoji ? "reaction-pop" : ""
              }`}
              onAnimationEnd={() =>
                setPopping((p) => (p === emoji ? null : p))
              }
            >
              {emoji}
            </span>
            <span
              className={`inline-block tabular-nums ${
                popping === emoji ? "reaction-count-bump" : ""
              }`}
              style={{ color: "var(--ink-muted)" }}
            >
              {counts[emoji]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
