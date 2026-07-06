import { prisma } from "@/lib/db";

export function getSongs() {
  return prisma.song.findMany({
    orderBy: { createdAt: "desc" },
  });
}
