"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BG_PRESETS, type BgMode } from "@/lib/config";
import type { BackgroundConfig } from "@/lib/settings";
import { uploadImage } from "@/lib/upload";

const MODES: { value: BgMode; label: string; hint: string }[] = [
  { value: "theme", label: "Theme", hint: "Generated night sky + mountains" },
  { value: "preset", label: "Preset", hint: "Pick a bundled scene" },
  { value: "custom", label: "Upload", hint: "Use your own image" },
  { value: "auto", label: "Auto (time of day)", hint: "Changes through the day" },
];

export function BackgroundPicker({ current }: { current: BackgroundConfig }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<BgMode>(current.mode);
  const [preset, setPreset] = useState<string | null>(current.preset);
  const [custom, setCustom] = useState<string | null>(current.custom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: BackgroundConfig) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ background: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't save. Try again.");
      return false;
    }
    router.refresh();
    return true;
  }

  function chooseMode(next: BgMode) {
    setMode(next);
    // Theme and auto are complete on their own; preset/custom wait for a pick.
    if (next === "theme" || next === "auto") {
      save({ mode: next, preset, custom });
    } else if (next === "preset" && preset) {
      save({ mode: "preset", preset, custom });
    } else if (next === "custom" && custom) {
      save({ mode: "custom", preset, custom });
    }
  }

  function choosePreset(id: string) {
    setPreset(id);
    setMode("preset");
    save({ mode: "preset", preset: id, custom });
  }

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      setCustom(url);
      setMode("custom");
      await save({ mode: "custom", preset, custom: url });
    } catch {
      setError("Upload failed. Check that the Blob store is configured.");
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => chooseMode(m.value)}
              aria-pressed={active}
              title={m.hint}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-accent text-accent"
                  : "border-border text-foreground/70 hover:border-foreground/30"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Preset grid */}
      {mode === "preset" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {BG_PRESETS.map((p) => {
            const active = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => choosePreset(p.id)}
                aria-pressed={active}
                className={`group overflow-hidden rounded-lg border-2 text-left transition-colors ${
                  active ? "border-accent" : "border-border hover:border-foreground/30"
                }`}
              >
                <div
                  className="h-28 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url("${p.src}")` }}
                />
                <div className="flex items-center justify-between bg-surface px-3 py-2">
                  <span className="text-sm text-heading">{p.label}</span>
                  <span
                    className={`text-xs font-medium ${
                      active ? "text-accent" : "text-foreground/40"
                    }`}
                  >
                    {active ? "● Active" : "Use"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Custom upload */}
      {mode === "custom" && (
        <div className="mt-6">
          {custom && (
            <div
              className="mb-4 h-40 w-full rounded-lg border-2 border-border bg-cover bg-center"
              style={{ backgroundImage: `url("${custom}")` }}
            />
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="rounded-lg border-2 border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:border-foreground/30 disabled:opacity-50"
          >
            {custom ? "Replace image…" : "Upload image…"}
          </button>
          <p className="mt-2 text-xs text-foreground/50">
            Recommended: a landscape image around 2560×1440, WebP, under ~500&nbsp;KB.
          </p>
        </div>
      )}

      {/* Auto info */}
      {mode === "auto" && (
        <p className="mt-6 text-sm text-foreground/60">
          The background follows the clock: <strong>Bright Day</strong> from 9am–5pm,{" "}
          <strong>Sunset Ridge</strong> around dawn and dusk, and{" "}
          <strong>Starlit Night</strong> overnight.
        </p>
      )}

      {busy && <p className="mt-4 text-sm text-foreground/50">Saving…</p>}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
