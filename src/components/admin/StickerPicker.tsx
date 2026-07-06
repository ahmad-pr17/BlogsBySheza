"use client";

import { useEffect, useState } from "react";

type Sticker = { id: string; name: string; url: string };
type SearchResult = { id: string; title: string; url: string; preview: string };

type Props = {
  onInsert: (url: string, name: string) => void;
};

export function StickerPicker({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"retro" | "search">("retro");

  const [retro, setRetro] = useState<Sticker[]>([]);
  const [retroLoaded, setRetroLoaded] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load the curated set the first time the picker opens.
  useEffect(() => {
    if (!open || retroLoaded) return;
    fetch("/api/stickers")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Sticker[]) => setRetro(data))
      .catch(() => setRetro([]))
      .finally(() => setRetroLoaded(true));
  }, [open, retroLoaded]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `/api/stickers/search?q=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setSearchError(
          data?.error === "GIPHY_API_KEY is not set"
            ? "Giphy search isn’t configured yet (missing GIPHY_API_KEY)."
            : "Search failed. Try again.",
        );
        setResults([]);
      } else {
        setResults(data.results ?? []);
      }
    } catch {
      setSearchError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function pick(url: string, name: string) {
    onInsert(url, name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-accent hover:text-accent-hover"
      >
        Sticker
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded border border-border bg-surface p-3 shadow-lg sm:w-96">
          <div className="mb-3 flex gap-4 border-b border-border pb-2 text-sm">
            <button
              type="button"
              onClick={() => setTab("retro")}
              className={
                tab === "retro"
                  ? "font-medium text-accent"
                  : "text-foreground/60 hover:text-accent"
              }
            >
              Retro
            </button>
            <button
              type="button"
              onClick={() => setTab("search")}
              className={
                tab === "search"
                  ? "font-medium text-accent"
                  : "text-foreground/60 hover:text-accent"
              }
            >
              Search GIFs
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto text-foreground/40 hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {tab === "retro" ? (
            <div className="max-h-64 overflow-y-auto">
              {!retroLoaded ? (
                <p className="py-6 text-center text-sm text-foreground/50">
                  Loading…
                </p>
              ) : retro.length === 0 ? (
                <p className="py-6 text-center text-sm text-foreground/50">
                  No stickers yet. Add some on the Stickers page.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {retro.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pick(s.url, s.name)}
                      title={s.name}
                      className="flex aspect-square items-center justify-center rounded border border-border bg-background p-1 hover:border-accent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.url}
                        alt={s.name}
                        className="max-h-full max-w-full"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <form onSubmit={runSearch} className="mb-2 flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search GIFs…"
                  className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="rounded border border-border px-2 py-1 text-sm hover:border-accent disabled:opacity-50"
                >
                  {searching ? "…" : "Go"}
                </button>
              </form>
              {searchError && (
                <p className="mb-2 text-xs text-red-400">{searchError}</p>
              )}
              <div className="max-h-56 overflow-y-auto">
                {results.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {results.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => pick(r.url, r.title)}
                        title={r.title}
                        className="flex aspect-square items-center justify-center rounded border border-border bg-background p-1 hover:border-accent"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.preview}
                          alt={r.title}
                          className="max-h-full max-w-full"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 text-right text-[10px] text-foreground/40">
                Powered by GIPHY
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
