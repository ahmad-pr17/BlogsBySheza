import { NextResponse } from "next/server";
import { Status } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/session";
import { generateUniqueSlug } from "@/lib/slug";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const nextStatus =
    status === Status.PUBLISHED ? Status.PUBLISHED : Status.DRAFT;
  const slug =
    title !== existing.title
      ? await generateUniqueSlug(title, id)
      : existing.slug;
  const publishedAt =
    nextStatus === Status.PUBLISHED
      ? (existing.publishedAt ?? new Date())
      : existing.publishedAt;

  const post = await prisma.post.update({
    where: { id },
    data: {
      title,
      slug,
      content,
      excerpt: excerpt || null,
      category: category || existing.category,
      author: author || existing.author,
      coverImage: coverImage || null,
      status: nextStatus,
      publishedAt,
    },
  });

  return NextResponse.json(post);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (status !== Status.PUBLISHED && status !== Status.DRAFT) {
    return NextResponse.json(
      { error: "status must be DRAFT or PUBLISHED" },
      { status: 400 },
    );
  }

  const publishedAt =
    status === Status.PUBLISHED
      ? (existing.publishedAt ?? new Date())
      : existing.publishedAt;

  const post = await prisma.post.update({
    where: { id },
    data: { status, publishedAt },
  });

  return NextResponse.json(post);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
