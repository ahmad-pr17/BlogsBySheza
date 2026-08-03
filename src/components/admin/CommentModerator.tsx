"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  postTitle: string;
  postSlug: string;
};

export function CommentModerator({ initial }: { initial: Comment[] }) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);

  async function remove(id: string) {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    }
  }

  if (comments.length === 0) {
    return <p className="text-sm text-foreground/50">No comments yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((c) => (
        <li
          key={c.id}
          className="flex items-start gap-3 rounded border border-border bg-surface p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold text-heading">{c.author}</span>
              <span className="text-foreground/40">
                {" "}
                on{" "}
                <Link
                  href={`/blog/${c.postSlug}#comments`}
                  className="underline hover:text-accent"
                >
                  {c.postTitle}
                </Link>
              </span>
            </p>
            <p className="mt-1 break-words whitespace-pre-wrap text-foreground/80">
              {c.body}
            </p>
            <p className="mt-1 text-xs text-foreground/40">
              {new Date(c.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => remove(c.id)}
            className="shrink-0 rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-400/10"
            aria-label="Delete comment"
          >
            ✕ Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
