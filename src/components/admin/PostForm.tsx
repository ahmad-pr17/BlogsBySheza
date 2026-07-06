"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { StickerPicker } from "@/components/admin/StickerPicker";
import { Status } from "@/generated/prisma/enums";
import type { PostModel } from "@/generated/prisma/models/Post";
import { uploadImage } from "@/lib/upload";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Inserts markdown at the textarea cursor (falling back to appending) and
  // keeps the local content state in sync.
  function insertIntoContent(markdown: string) {
    const el = contentRef.current;
    if (!el) {
      setContent((c) => c + markdown);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = content.slice(0, start) + markdown + content.slice(end);
    setContent(next);
    // Restore the caret just after the inserted text on the next tick.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + markdown.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleUpload(file: File, into: "cover" | "content") {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      if (into === "cover") {
        setCoverImage(url);
      } else {
        const alt = file.name.replace(/\.[^.]+$/, "");
        insertIntoContent(`\n\n![${alt}](${url})\n\n`);
      }
    } catch {
      setError("Upload failed. Check that the Blob store is configured.");
    } finally {
      setUploading(false);
    }
  }

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
        <div className="flex flex-col gap-2 text-sm text-foreground/80 sm:col-span-2">
          Cover image
          <div className="flex gap-2">
            <input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="Paste a URL or upload…"
              className="flex-1 rounded border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-accent"
            />
            <label className="cursor-pointer whitespace-nowrap rounded border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent">
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, "cover");
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt="Cover preview"
              className="mt-1 max-h-40 w-auto rounded border border-border"
            />
          )}
        </div>
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
          <div className="flex items-center gap-4">
            <label className="cursor-pointer text-sm text-accent hover:text-accent-hover">
              {uploading ? "Uploading…" : "Insert image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, "content");
                  e.target.value = "";
                }}
              />
            </label>
            <StickerPicker
              onInsert={(url, name) =>
                insertIntoContent(`\n\n![${name}](${url})\n\n`)
              }
            />
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="text-sm text-accent hover:text-accent-hover"
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
          </div>
        </div>
        <div className={`grid gap-4 ${showPreview ? "sm:grid-cols-2" : ""}`}>
          <textarea
            ref={contentRef}
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
