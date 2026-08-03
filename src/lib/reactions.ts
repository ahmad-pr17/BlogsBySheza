// Client-safe reaction constants and helpers. Deliberately imports nothing
// server-only (no prisma) so it can be used from client components like
// ReactionBar. The DB query lives in lib/reactionCounts.ts.

// The fixed set of reactions readers can leave on a post, in display order.
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type ReactionCounts = Record<ReactionEmoji, number>;

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return (
    typeof value === "string" &&
    (REACTION_EMOJIS as readonly string[]).includes(value)
  );
}
