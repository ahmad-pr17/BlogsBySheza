import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getReactionCounts } from "@/lib/reactionCounts";
import { isReactionEmoji } from "@/lib/reactions";

// Public: toggle a reaction count up or down. The client tracks (in
// localStorage) which emoji this visitor has picked, and sends the intended
// direction. Counts never drop below zero.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { postId, emoji, op } = body ?? {};

  if (typeof postId !== "string" || !postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }
  if (!isReactionEmoji(emoji)) {
    return NextResponse.json({ error: "Unknown reaction" }, { status: 400 });
  }
  const direction = op === "remove" ? -1 : 1;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (direction === 1) {
    await prisma.reaction.upsert({
      where: { postId_emoji: { postId, emoji } },
      create: { postId, emoji, count: 1 },
      update: { count: { increment: 1 } },
    });
  } else {
    // Only decrement an existing row, and clamp at 0.
    const existing = await prisma.reaction.findUnique({
      where: { postId_emoji: { postId, emoji } },
    });
    if (existing && existing.count > 0) {
      await prisma.reaction.update({
        where: { postId_emoji: { postId, emoji } },
        data: { count: { decrement: 1 } },
      });
    }
  }

  const counts = await getReactionCounts(postId);
  return NextResponse.json({ counts });
}
