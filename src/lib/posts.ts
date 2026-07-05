import { prisma } from "@/lib/db";
import { Status } from "@/generated/prisma/enums";

export function getPublishedPosts() {
  return prisma.post.findMany({
    where: { status: Status.PUBLISHED },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
}

export function getPublishedPostBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { slug, status: Status.PUBLISHED },
  });
}
