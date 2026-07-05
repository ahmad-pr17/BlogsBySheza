"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  TITLE_EYEBROWS,
  TITLE_STYLE_OPTIONS,
  type TitleStyle,
} from "@/lib/config";

export function TitleStylePicker({ current }: { current: TitleStyle }) {
  const router = useRouter();
  const [selected, setSelected] = useState<TitleStyle>(current);
  const [saving, setSaving] = useState<TitleStyle | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(style: TitleStyle) {
    if (style === selected) return;
    const previous = selected;
    setSelected(style);
    setSaving(style);
    setError(null);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titleStyle: style }),
    });

    setSaving(null);

    if (!res.ok) {
      setSelected(previous);
      setError("Couldn't save. Try again.");
      return;
    }

    // Re-render the public header (in the layout) with the new style.
    router.refresh();
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TITLE_STYLE_OPTIONS.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt.value)}
              aria-pressed={isActive}
              className={`group relative flex flex-col overflow-hidden rounded-lg border-2 text-left transition-colors ${
                isActive
                  ? "border-accent"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              <div className="flex h-32 items-center justify-center overflow-hidden bg-[#0b1030]">
                <div className="scale-[0.55]">
                  <div className={`wordmark t-${opt.value}`}>
                    <div className="eyebrow">{TITLE_EYEBROWS[opt.value]}</div>
                    <div className="line1">Sheza&apos;s</div>
                    <div className="line2">Blogs</div>
                    {opt.value === "c" && <div className="rule" />}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-heading">
                    {opt.label}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {opt.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    isActive ? "text-accent" : "text-foreground/40"
                  }`}
                >
                  {saving === opt.value
                    ? "Saving…"
                    : isActive
                      ? "● Active"
                      : "Use"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
