import { prisma } from "@/lib/db";
import {
  REACTION_EMOJIS,
  type ReactionCounts,
} from "@/lib/reactions";

// Returns a count for every emoji in REACTION_EMOJIS (0 when none stored yet),
// so the UI always renders the full bar in a stable order. Server-only (uses
// prisma) — keep out of client component import chains.
function toCounts(byEmoji: Map<string, number>): ReactionCounts {
  const counts = {} as ReactionCounts;
  for (const emoji of REACTION_EMOJIS) {
    counts[emoji] = byEmoji.get(emoji) ?? 0;
  }
  return counts;
}

export async function getReactionCounts(
  postId: string,
): Promise<ReactionCounts> {
  const rows = await prisma.reaction.findMany({ where: { postId } });
  return toCounts(new Map(rows.map((r) => [r.emoji, r.count])));
}

// Reaction counts for many posts in one query, for the home feed.
export async function getReactionCountsByPost(
  postIds: string[],
): Promise<Map<string, ReactionCounts>> {
  const result = new Map<string, ReactionCounts>();
  if (postIds.length === 0) return result;

  const rows = await prisma.reaction.findMany({
    where: { postId: { in: postIds } },
  });

  const byPost = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = byPost.get(r.postId) ?? new Map<string, number>();
    m.set(r.emoji, r.count);
    byPost.set(r.postId, m);
  }

  for (const postId of postIds) {
    result.set(postId, toCounts(byPost.get(postId) ?? new Map()));
  }
  return result;
}
