import type { CSSProperties } from "react";
import Link from "next/link";
import { PostEntry } from "@/components/PostEntry";
import { ReactionBar } from "@/components/ReactionBar";
import { formatPostDate } from "@/lib/format";
import type { PostModel } from "@/generated/prisma/models/Post";
import type { ReactionCounts } from "@/lib/reactions";

type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: Date;
};

// Subtle, deterministic tilts so the bubbles feel scattered rather than a rigid
// column (no Math.random — must be stable between server and client render).
const TILTS = ["-2.5deg", "1.5deg", "-1.5deg", "2.5deg", "-1deg", "2deg"];

function Bubble({
  comment,
  side,
  index,
}: {
  comment: Comment;
  side: "left" | "right";
  index: number;
}) {
  // Enough X-nudge to clear the grid gap AND rest ~30px onto the post edge.
  const sideVars =
    side === "left"
      ? { "--overlap": "60px", "--ry": "8deg" }
      : { "--overlap": "-60px", "--ry": "-8deg" };

  return (
    <div
      className={`comment-bubble w-fit max-w-full rounded-2xl px-4 py-2.5 ${
        side === "left" ? "ml-auto rounded-br-sm" : "mr-auto rounded-bl-sm"
      }`}
      style={
        {
          background: "var(--parchment-hi)",
          border: "1px solid rgba(122, 74, 34, 0.18)",
          "--tilt": TILTS[index % TILTS.length],
          "--float-delay": `${(index % 4) * 0.6}s`,
          "--float-dur": `${5.5 + (index % 3) * 0.8}s`,
          ...sideVars,
        } as CSSProperties
      }
    >
      <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
        {comment.author}
        <span
          className="ml-2 font-normal"
          style={{ color: "var(--ink-muted)" }}
        >
          {formatPostDate(comment.createdAt)}
        </span>
      </p>
      <p
        className="mt-0.5 text-sm leading-relaxed break-words whitespace-pre-wrap"
        style={{ color: "var(--ink-body)" }}
      >
        {comment.body}
      </p>
    </div>
  );
}

// A post with its comments floating as bubbles in the left/right gutters on
// wide screens. Below xl the layout stacks: post first, then the bubbles.
// Writing a comment still happens on the post page (the caption links there).
export function PostWithComments({
  post,
  comments,
  reactionCounts,
}: {
  post: PostModel;
  comments: Comment[];
  reactionCounts: ReactionCounts;
}) {
  const left = comments.filter((_, i) => i % 2 === 0);
  const right = comments.filter((_, i) => i % 2 === 1);
  const addHref = `/blog/${post.slug}#comments`;
  const hasComments = comments.length > 0;

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_minmax(0,48rem)_1fr] xl:gap-6">
      {/* Left gutter */}
      <div className="order-2 mx-auto flex w-full max-w-3xl flex-col gap-3 xl:order-1 xl:mx-0 xl:max-w-none xl:pt-24">
        {left.map((c, i) => (
          <Bubble key={c.id} comment={c} side="left" index={i} />
        ))}
      </div>

      {/* Center: the post, a reaction bar, and a compact comment caption */}
      <div className="order-1 mx-auto flex w-full max-w-3xl flex-col gap-3 xl:order-2 xl:max-w-none">
        <PostEntry post={post} />
        <div className="px-1">
          <ReactionBar postId={post.id} initial={reactionCounts} />
        </div>
        <p className="px-1 text-xs text-foreground/60">
          {hasComments ? (
            <>💬 {comments.length} comment{comments.length === 1 ? "" : "s"} · </>
          ) : (
            <>No comments yet · </>
          )}
          <Link
            href={addHref}
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {hasComments ? "Leave a comment →" : "Be the first →"}
          </Link>
        </p>
      </div>

      {/* Right gutter */}
      <div className="order-3 mx-auto flex w-full max-w-3xl flex-col gap-3 xl:mx-0 xl:max-w-none xl:pt-24">
        {right.map((c, i) => (
          <Bubble key={c.id} comment={c} side="right" index={i} />
        ))}
      </div>
    </div>
  );
}
