import Link from "next/link";
import { PostRowActions } from "@/components/admin/PostRowActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { prisma } from "@/lib/db";
import { formatPostDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const posts = await prisma.post.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-heading">Dashboard</h1>
        <Link
          href="/admin/new"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover"
        >
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-foreground/60">No posts yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/edit/${post.id}`}
                    className="font-medium text-heading hover:text-accent"
                  >
                    {post.title}
                  </Link>
                  <StatusBadge status={post.status} />
                </div>
                <p className="mt-1 text-sm text-foreground/60">
                  {formatPostDate(post.updatedAt)} · {post.category}
                </p>
              </div>
              <PostRowActions id={post.id} status={post.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
