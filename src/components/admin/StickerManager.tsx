"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadImage } from "@/lib/upload";

type Sticker = {
  id: string;
  name: string;
  url: string;
  category: string;
};

export function StickerManager({ initial }: { initial: Sticker[] }) {
  const router = useRouter();
  const [stickers, setStickers] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        const name = file.name.replace(/\.[^.]+$/, "");
        const res = await fetch("/api/stickers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, url, category: "retro" }),
        });
        if (!res.ok) throw new Error();
        const created: Sticker = await res.json();
        setStickers((prev) => [created, ...prev]);
      }
    } catch {
      setError("Upload failed. Check that the Blob store is configured.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this sticker?")) return;
    const res = await fetch(`/api/stickers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setStickers((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded border border-dashed border-border px-4 py-3 text-sm text-foreground/80 transition-colors hover:border-accent">
        {busy ? "Uploading…" : "＋ Upload GIFs / images"}
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {stickers.length === 0 ? (
        <p className="text-sm text-foreground/50">
          No stickers yet. Upload your retro pack to get started — they’ll show
          up in the editor’s sticker picker.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {stickers.map((s) => (
            <div
              key={s.id}
              className="group relative flex aspect-square items-center justify-center rounded border border-border bg-surface p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt={s.name}
                title={s.name}
                className="max-h-full max-w-full"
              />
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="absolute top-1 right-1 rounded bg-background/80 px-1.5 text-xs text-red-400 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove sticker"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
