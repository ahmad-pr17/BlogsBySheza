"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCanAdmin } from "@/components/game/AdminContext";
import { KIND_LABEL, songKind } from "@/lib/songSource";

type Track = { id: string; title: string; artist: string; audio: string; license: string };

const TAGS = ["lofi", "chillout", "ambient", "piano", "acoustic", "jazz", "classical", "electronic", "pop", "rock", "hiphop", "cinematic"];

const field: React.CSSProperties = {
  padding: "6px 8px",
  font: "inherit",
  fontSize: 15,
  color: "#3a2a18",
  background: "var(--parchment-hi)",
  border: "3px solid var(--wood-dark)",
  borderRadius: 6,
};

// "Find music" inside the jukebox: only for Sheza and the superadmin. Search
// Jamendo's free music, or paste a YouTube / SoundCloud link, and add songs
// right here instead of going to the admin page.
export function SongFinder() {
  const canAdmin = useCanAdmin();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("lofi");
  const [link, setLink] = useState("");
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);

  if (!canAdmin) return null;

  const say = (text: string, bad = false) => setMsg({ text, bad });

  async function add(body: { title: string; artist?: string; url: string }) {
    const res = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) throw new Error(res.status === 401 ? "Please log in again." : (d?.error ?? "Could not add it."));
    router.refresh(); // the list below updates (everyone else's does too)
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const params = new URLSearchParams({ q: q.trim(), tag: q.trim() ? "" : tag });
      const res = await fetch(`/api/jamendo/search?${params}`);
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Search failed.");
      setTracks(d.tracks);
      if (!d.tracks.length) say("Nothing found. Try another search.", true);
    } catch (err) {
      setTracks(null);
      say(err instanceof Error ? err.message : "Search failed.", true);
    } finally {
      setBusy(false);
    }
  }

  async function addTrack(t: Track) {
    setBusy(true);
    setMsg(null);
    try {
      await add({ title: t.title, artist: `${t.artist} (Jamendo)`, url: t.audio });
      say(`Added “${t.title}”!`);
    } catch (err) {
      say(err instanceof Error ? err.message : "Could not add it.", true);
    } finally {
      setBusy(false);
    }
  }

  async function addLink() {
    if (!link.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/songs/lookup?url=${encodeURIComponent(link.trim())}`);
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Could not read that link.");
      await add({ title: d.title || "Untitled", artist: d.artist || undefined, url: d.url });
      say(`Added from ${KIND_LABEL[songKind(d.url).kind]}!`);
      setLink("");
    } catch (err) {
      say(err instanceof Error ? err.message : "Could not add it.", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mt-6 rounded-lg p-3"
      style={{ background: "rgba(255,255,255,0.35)", border: "3px solid var(--wood-dark)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left font-semibold"
        style={{ color: "var(--ink)" }}
      >
        🔎 Find music {open ? "▴" : "▾"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <form onSubmit={search} className="flex flex-wrap gap-2">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or artist"
              aria-label="Search Jamendo"
              style={{ ...field, flex: "1 1 160px", minWidth: 0 }}
            />
            <select value={tag} onChange={(e) => setTag(e.target.value)} disabled={!!q.trim()} aria-label="Mood or genre" style={field}>
              {TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button type="submit" disabled={busy} style={{ ...field, cursor: "pointer" }}>
              {busy ? "…" : "Search"}
            </button>
          </form>
          <p className="text-xs" style={{ color: "var(--ink-body)" }}>
            Free Creative Commons music from Jamendo. Check the licence if you ever make money from the blog.
          </p>

          {tracks && tracks.length > 0 && (
            <ul className="space-y-2">
              {tracks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2">
                  <audio src={t.audio} controls preload="none" style={{ height: 32, maxWidth: "100%" }} />
                  <span className="min-w-0 flex-1 basis-32 text-sm" style={{ color: "var(--ink)" }}>
                    <span className="block truncate font-medium">{t.title}</span>
                    <span className="block truncate text-xs" style={{ color: "var(--ink-body)" }}>
                      {t.artist}
                    </span>
                  </span>
                  <button type="button" disabled={busy} onClick={() => void addTrack(t)} style={{ ...field, cursor: "pointer" }}>
                    ＋ Add
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="…or paste a YouTube / SoundCloud link"
              aria-label="YouTube or SoundCloud link"
              style={{ ...field, flex: 1, minWidth: 0 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addLink();
                }
              }}
            />
            <button type="button" disabled={busy || !link.trim()} onClick={() => void addLink()} style={{ ...field, cursor: "pointer" }}>
              Add
            </button>
          </div>

          {msg && (
            <p className="text-sm" role="status" style={{ color: msg.bad ? "#a1352a" : "#2f6b2f" }}>
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
