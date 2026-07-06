"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";

type Song = {
  id: string;
  title: string;
  artist: string;
  url: string;
};

export function SongManager({ initial }: { initial: Song[] }) {
  const router = useRouter();
  const [songs, setSongs] = useState(initial);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      // Fall back to the filename (minus extension) when no title was typed.
      const fallbackTitle = file.name.replace(/\.[^.]+$/, "");
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || fallbackTitle,
          artist: artist.trim() || undefined,
          url,
        }),
      });
      if (!res.ok) throw new Error();
      const created: Song = await res.json();
      setSongs((prev) => [created, ...prev]);
      setTitle("");
      setArtist("");
      router.refresh();
    } catch {
      setError("Upload failed. Check that the Blob store is configured.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this song?")) return;
    const res = await fetch(`/api/songs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSongs((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded border border-border bg-surface/60 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-foreground/80">
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Magical Fantasy"
              className="rounded border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground/80">
            Artist
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Dmitriy"
              className="rounded border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2 rounded border border-dashed border-border px-4 py-3 text-sm text-foreground/80 transition-colors hover:border-accent">
          {busy ? "Uploading…" : "＋ Upload a song"}
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/x-m4a,audio/webm"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <p className="text-xs text-foreground/50">
          Title/artist are optional — the filename is used if you leave them
          blank. Use royalty-free tracks (e.g. Pixabay) or music you have the
          rights to.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {songs.length === 0 ? (
        <p className="text-sm text-foreground/50">
          No songs uploaded yet. The default “Magical Fantasy” still shows on the
          public Song page.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {songs.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded border border-border bg-surface p-3"
            >
              <audio src={s.url} controls preload="none" className="h-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-heading">{s.title}</p>
                <p className="truncate text-xs text-foreground/50">{s.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="shrink-0 rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-400/10"
                aria-label={`Remove ${s.title}`}
              >
                ✕ Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
