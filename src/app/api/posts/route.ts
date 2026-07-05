import { NextResponse } from "next/server";
import { Status } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/session";
import { generateUniqueSlug } from "@/lib/slug";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam === Status.DRAFT || statusParam === Status.PUBLISHED
      ? statusParam
      : undefined;

  const posts = await prisma.post.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { title, content, excerpt, category, author, coverImage, status } =
    body ?? {};

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 },
    );
  }

  const slug = await generateUniqueSlug(title);
  const finalStatus = status === Status.PUBLISHED ? Status.PUBLISHED : Status.DRAFT;

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content,
      excerpt: excerpt || null,
      ...(category ? { category } : {}),
      ...(author ? { author } : {}),
      coverImage: coverImage || null,
      status: finalStatus,
      publishedAt: finalStatus === Status.PUBLISHED ? new Date() : null,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
