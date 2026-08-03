import { CommentModerator } from "@/components/admin/CommentModerator";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminCommentsPage() {
  const rows = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    include: { post: { select: { title: true, slug: true } } },
  });

  const comments = rows.map((c) => ({
    id: c.id,
    author: c.author,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    postTitle: c.post.title,
    postSlug: c.post.slug,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-heading">Comments</h1>
      <p className="mb-8 text-sm text-foreground/60">
        Every comment left on the blog. Delete anything that shouldn&apos;t be
        here — removals take effect immediately.
      </p>
      <CommentModerator initial={comments} />
    </div>
  );
}
