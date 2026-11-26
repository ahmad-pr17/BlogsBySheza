"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { KIND_LABEL, songKind } from "@/lib/songSource";
import { uploadFile } from "@/lib/upload";

type Song = {
  id: string;
  title: string;
  artist: string;
  url: string;
};

type JamendoTrack = {
  id: string;
  title: string;
  artist: string;
  audio: string;
  image: string;
  duration: number;
  license: string;
  page: string;
};

const TAGS = ["lofi", "chillout", "ambient", "piano", "acoustic", "jazz", "classical", "electronic", "pop", "rock", "hiphop", "cinematic"];

const inputCls =
  "rounded border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent";
const btnCls =
  "rounded border border-border px-3 py-2 text-sm text-foreground/80 transition-colors hover:border-accent disabled:opacity-50";

export function SongManager({ initial }: { initial: Song[] }) {
  const router = useRouter();
  const [songs, setSongs] = useState(initial);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [tag, setTag] = useState("lofi");
  const [tracks, setTracks] = useState<JamendoTrack[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function addSong(body: { title: string; artist?: string; url: string }) {
    const res = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Could not add the song.");
    setSongs((prev) => [data as Song, ...prev]);
    router.refresh();
  }

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const url = await uploadFile(file);
      // Fall back to the filename (minus extension) when no title was typed.
      const fallbackTitle = file.name.replace(/\.[^.]+$/, "");
      await addSong({ title: title.trim() || fallbackTitle, artist: artist.trim() || undefined, url });
      setTitle("");
      setArtist("");
    } catch {
      setError("Upload failed. Check that the Blob store is configured.");
    } finally {
      setBusy(false);
    }
  }

  // A YouTube / SoundCloud / audio link: look up its title, then add it.
  async function handleLink() {
    if (!link.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/songs/lookup?url=${encodeURIComponent(link.trim())}`);
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Could not read that link.");
      await addSong({
        title: title.trim() || d.title || "Untitled",
        artist: artist.trim() || d.artist || undefined,
        url: d.url,
      });
      setNotice(`Added from ${KIND_LABEL[songKind(d.url).kind]}.`);
      setLink("");
      setTitle("");
      setArtist("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that link.");
    } finally {
      setBusy(false);
    }
  }

  async function searchJamendo(e?: React.FormEvent) {
    e?.preventDefault();
    setSearching(true);
    setError(null);
    setNotice(null);
    try {
      const params = new URLSearchParams({ q: q.trim(), tag: q.trim() ? "" : tag });
      const res = await fetch(`/api/jamendo/search?${params}`);
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Search failed.");
      setTracks(d.tracks);
    } catch (err) {
      setTracks(null);
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function addJamendo(t: JamendoTrack) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await addSong({ title: t.title, artist: `${t.artist} (Jamendo)`, url: t.audio });
      setNotice(`Added “${t.title}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add it.");
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
        <p className="text-sm font-medium text-heading">Add a song</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-foreground/80">
            Title (optional)
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Magical Fantasy" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground/80">
            Artist (optional)
            <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Dmitriy" className={inputCls} />
          </label>
        </div>

        <div className="flex flex-col gap-1 text-sm text-foreground/80">
          <label htmlFor="song-link">From a link: YouTube, SoundCloud, or a direct audio link</label>
          <div className="flex gap-2">
            <input
              id="song-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…  or  https://soundcloud.com/…"
              className={`${inputCls} min-w-0 flex-1`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleLink();
                }
              }}
            />
            <button type="button" className={btnCls} disabled={busy || !link.trim()} onClick={() => void handleLink()}>
              {busy ? "Adding…" : "Add link"}
            </button>
          </div>
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2 rounded border border-dashed border-border px-4 py-3 text-sm text-foreground/80 transition-colors hover:border-accent">
          {busy ? "Working…" : "＋ Upload a song file"}
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
          Title and artist are filled in from YouTube / SoundCloud when you leave them blank. Only upload music you
          have the rights to. YouTube and SoundCloud songs play through their own players, and a few tracks are
          not allowed to be embedded.
        </p>
      </div>

      <form onSubmit={searchJamendo} className="flex flex-col gap-3 rounded border border-border bg-surface/60 p-4">
        <p className="text-sm font-medium text-heading">Find free music on Jamendo</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or artist (or pick a mood →)"
            className={`${inputCls} min-w-0 flex-1`}
            aria-label="Search Jamendo"
          />
          <select value={tag} onChange={(e) => setTag(e.target.value)} className={inputCls} aria-label="Mood or genre" disabled={!!q.trim()}>
            {TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button type="submit" className={btnCls} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        <p className="text-xs text-foreground/50">
          Creative Commons music by independent artists. Check each track&apos;s licence (some need credit, some are
          non-commercial). The artist name is saved with “(Jamendo)” as credit.
        </p>
        {tracks && tracks.length === 0 && <p className="text-sm text-foreground/60">Nothing found. Try another search.</p>}
        {tracks && tracks.length > 0 && (
          <ul className="flex flex-col gap-2">
            {tracks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 rounded border border-border bg-surface p-3">
                <audio src={t.audio} controls preload="none" className="h-8 max-w-full" />
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate font-medium text-heading">{t.title}</p>
                  <p className="truncate text-xs text-foreground/50">
                    {t.artist}
                    {t.license && (
                      <>
                        {" · "}
                        <a href={t.license} target="_blank" rel="noreferrer" className="underline">
                          licence
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <button type="button" className={btnCls} disabled={busy} onClick={() => void addJamendo(t)}>
                  ＋ Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-green-400">{notice}</p>}

      {songs.length === 0 ? (
        <p className="text-sm text-foreground/50">
          No songs added yet. The default “Magical Fantasy” still shows on the public Song page.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {songs.map((s) => {
            const { kind } = songKind(s.url);
            return (
              <li key={s.id} className="flex items-center gap-3 rounded border border-border bg-surface p-3">
                {kind === "file" ? (
                  <audio src={s.url} controls preload="none" className="h-8" />
                ) : (
                  <span className="shrink-0 rounded bg-background px-2 py-1 text-xs text-foreground/70">{KIND_LABEL[kind]}</span>
                )}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
