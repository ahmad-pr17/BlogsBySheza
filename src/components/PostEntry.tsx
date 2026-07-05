import Link from "next/link";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Panel } from "@/components/Panel";
import { formatPostDate } from "@/lib/format";
import type { PostModel as Post } from "@/generated/prisma/models/Post";

export function PostEntry({
  post,
  linkTitle = true,
}: {
  post: Post;
  linkTitle?: boolean;
}) {
  const date = post.publishedAt ?? post.createdAt;

  return (
    <Panel>
      <article>
        <h2
          className="text-2xl font-semibold sm:text-3xl"
          style={{ color: "var(--ink)" }}
        >
          {linkTitle ? (
            <Link
              href={`/blog/${post.slug}`}
              className="transition-opacity hover:opacity-75"
            >
              {post.title}
            </Link>
          ) : (
            post.title
          )}
        </h2>

        <p className="mt-2 mb-5 text-sm" style={{ color: "var(--ink-muted)" }}>
          {formatPostDate(date)} · by {post.author} ·{" "}
          <span style={{ color: "var(--link)" }}>{post.category}</span>
        </p>

        <MarkdownContent content={post.content} />

        <p className="mt-5 text-xs" style={{ color: "var(--ink-muted)" }}>
          Categories:{" "}
          <span style={{ color: "var(--link)" }}>{post.category}</span> ·{" "}
          <span style={{ color: "var(--link)" }}>Leave a comment</span>
        </p>
      </article>
    </Panel>
  );
}
