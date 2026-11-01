"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Readers } from "@/components/game/Readers";

// Full-screen sheet on phones, centred card on larger screens.
export function PostModal({
  title,
  onClose,
  readers,
  children,
}: {
  title: string;
  onClose: () => void;
  readers?: boolean;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="game-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="game-modal-body">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="game-modal-close"
        >
          ✕ Back to the trail
        </button>
        {readers && <Readers />}
        {children}
      </div>
    </div>
  );
}
