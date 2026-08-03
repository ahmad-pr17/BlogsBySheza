import { prisma } from "@/lib/db";
import {
  REACTION_EMOJIS,
  type ReactionCounts,
} from "@/lib/reactions";

// Returns a count for every emoji in REACTION_EMOJIS (0 when none stored yet),
// so the UI always renders the full bar in a stable order. Server-only (uses
// prisma) — keep out of client component import chains.
export async function getReactionCounts(
  postId: string,
): Promise<ReactionCounts> {
  const rows = await prisma.reaction.findMany({ where: { postId } });
  const byEmoji = new Map(rows.map((r) => [r.emoji, r.count]));

  const counts = {} as ReactionCounts;
  for (const emoji of REACTION_EMOJIS) {
    counts[emoji] = byEmoji.get(emoji) ?? 0;
  }
  return counts;
}
