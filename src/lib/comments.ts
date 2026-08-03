import { prisma } from "@/lib/db";
import type { CommentModel } from "@/generated/prisma/models/Comment";

export function getCommentsForPost(postId: string) {
  return prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });
}

// Fetches comments for many posts in a single query, grouped by postId, so the
// home feed doesn't fire one query per post.
export async function getCommentsByPost(
  postIds: string[],
): Promise<Map<string, CommentModel[]>> {
  const grouped = new Map<string, CommentModel[]>();
  if (postIds.length === 0) return grouped;

  const comments = await prisma.comment.findMany({
    where: { postId: { in: postIds } },
    orderBy: { createdAt: "asc" },
  });

  for (const comment of comments) {
    const list = grouped.get(comment.postId);
    if (list) list.push(comment);
    else grouped.set(comment.postId, [comment]);
  }
  return grouped;
}
