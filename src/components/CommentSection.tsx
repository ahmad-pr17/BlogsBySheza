"use client";

import { useState } from "react";
import { formatPostDate } from "@/lib/format";

type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string | Date;
};

export function CommentSection({
  postId,
  initial,
}: {
  postId: string;
  initial: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, author, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong.");
      }
      const created: Comment = await res.json();
      setComments((prev) => [...prev, created]);
      setBody("");
      setAuthor("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="comments" className="scroll-mt-8">
      <h2
        className="text-xl font-semibold sm:text-2xl"
        style={{ color: "var(--ink)" }}
      >
        {comments.length > 0
          ? `${comments.length} comment${comments.length === 1 ? "" : "s"}`
          : "Leave a comment"}
      </h2>

      {comments.length > 0 && (
        <ul className="mt-5 space-y-4">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-md p-4"
              style={{
                background: "rgba(122, 74, 34, 0.08)",
                border: "1px solid rgba(122, 74, 34, 0.18)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {c.author}
                <span
                  className="ml-2 font-normal"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {formatPostDate(new Date(c.createdAt))}
                </span>
              </p>
              <p
                className="mt-1 whitespace-pre-wrap leading-relaxed"
                style={{ color: "var(--ink-body)" }}
              >
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={80}
          className="rounded border px-3 py-2 outline-none"
          style={{
            background: "var(--parchment-hi)",
            borderColor: "var(--wood)",
            color: "var(--ink)",
          }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment…"
          rows={4}
          maxLength={5000}
          className="rounded border px-3 py-2 outline-none"
          style={{
            background: "var(--parchment-hi)",
            borderColor: "var(--wood)",
            color: "var(--ink)",
          }}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="w-fit rounded-md px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
          style={{
            background: "var(--menu-bar)",
            border: "3px solid var(--wood-dark)",
            boxShadow: "inset 0 0 0 2px #f0c48c",
            color: "#5c3416",
          }}
        >
          {busy ? "Posting…" : "Post comment"}
        </button>
      </form>
    </section>
  );
}
