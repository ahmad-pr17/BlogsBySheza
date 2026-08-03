import { prisma } from "@/lib/db";

export function getCommentsForPost(postId: string) {
  return prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });
}
