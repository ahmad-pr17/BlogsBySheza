import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyOwnerOfComment } from "@/lib/email";

const MAX_BODY = 5000;
const MAX_NAME = 80;

// Public: anyone can leave a comment. Comments show immediately; the owner
// moderates (deletes) from the admin panel.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { postId, author, body: text } = body ?? {};

  if (typeof postId !== "string" || !postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "Comment can't be empty" },
      { status: 400 },
    );
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      body: text.trim().slice(0, MAX_BODY),
      author:
        typeof author === "string" && author.trim()
          ? author.trim().slice(0, MAX_NAME)
          : "Anonymous",
    },
  });

  // Fire-and-forget owner notification — never let email failure break posting.
  notifyOwnerOfComment(
    { title: post.title, slug: post.slug, excerpt: post.excerpt },
    { author: comment.author, body: comment.body },
  ).catch((err) => console.error("[comments] notify failed:", err));

  return NextResponse.json(comment, { status: 201 });
}
