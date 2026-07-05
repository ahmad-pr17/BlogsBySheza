"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Status } from "@/generated/prisma/enums";
import type { PostModel } from "@/generated/prisma/models/Post";

type Props =
  | { mode: "new"; post?: undefined }
  | { mode: "edit"; post: PostModel };

export function PostForm({ mode, post }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [category, setCategory] = useState(post?.category ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = () => ({
    title,
    category: category || undefined,
    excerpt: excerpt || undefined,
    coverImage: coverImage || undefined,
    content,
  });

  async function createPost(status: Status) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload(), status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function updatePost(status: Status) {
    if (!post) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload(), status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function deletePost() {
    if (!post) return;
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-foreground/80">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-foreground/80">
          Category
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Uncategorized"
            className="rounded border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-foreground/80 sm:col-span-2">
          Cover image URL
          <input
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://…"
            className="rounded border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-foreground/80 sm:col-span-2">
          Excerpt
          <input
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Optional short summary"
            className="rounded border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-foreground/80">
            Content (Markdown)
          </span>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-sm text-accent hover:text-accent-hover"
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
        </div>
        <div className={`grid gap-4 ${showPreview ? "sm:grid-cols-2" : ""}`}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="rounded border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent"
          />
          {showPreview && (
            <div className="rounded border border-border bg-surface px-4 py-3">
              <MarkdownContent content={content} />
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {mode === "new" ? (
          <>
            <button
              type="button"
              disabled={busy || !canSubmit}
              onClick={() => createPost(Status.DRAFT)}
              className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={busy || !canSubmit}
              onClick={() => createPost(Status.PUBLISHED)}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              Publish
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || !canSubmit}
              onClick={() => updatePost(post.status)}
              className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent disabled:opacity-50"
            >
              Update
            </button>
            <button
              type="button"
              disabled={busy || !canSubmit}
              onClick={() =>
                updatePost(
                  post.status === Status.PUBLISHED
                    ? Status.DRAFT
                    : Status.PUBLISHED,
                )
              }
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {post.status === Status.PUBLISHED ? "Unpublish" : "Publish"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={deletePost}
              className="ml-auto rounded px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
