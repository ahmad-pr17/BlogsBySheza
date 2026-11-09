"use client";

import { useEffect, useState } from "react";
import { BOOKS, type Book } from "./books";
import "./library.css";

const KEY = "trail-books";

function readSaved(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

function savePage(id: string, page: number) {
  try {
    const all = readSaved();
    all[id] = page;
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: ignore */
  }
}

export function Library(props: {
  onClose: () => void;
  onSound?: (name: string) => void;
}) {
  const { onClose, onSound } = props;
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const book: Book | undefined = BOOKS.find((b) => b.id === openId);
  const last = book ? book.pages.length : 0; // page 0 is the cover

  const openBook = (b: Book) => {
    const saved = readSaved()[b.id];
    const start =
      typeof saved === "number" && saved >= 0 && saved <= b.pages.length
        ? Math.floor(saved)
        : 0;
    setPage(start);
    setOpenId(b.id);
    onSound?.("chime");
  };

  const goTo = (n: number) => {
    if (!book) return;
    const next = Math.max(0, Math.min(last, n));
    if (next === page) return;
    setPage(next);
    savePage(book.id, next);
    onSound?.("page");
  };

  const backToShelf = () => {
    setOpenId(null);
    onSound?.("page");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (openId) {
          setOpenId(null);
        } else {
          onClose();
        }
        return;
      }
      if (!openId) return;
      const b = BOOKS.find((x) => x.id === openId);
      if (!b) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next = Math.max(
          0,
          Math.min(b.pages.length, page + (e.key === "ArrowRight" ? 1 : -1)),
        );
        if (next !== page) {
          setPage(next);
          savePage(b.id, next);
          onSound?.("page");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, page, onClose, onSound]);

  return (
    <div
      className="g-lib"
      role="dialog"
      aria-modal="true"
      aria-label="Bookshelf"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="g-lib-card">
        {!book ? (
          <>
            <h2 className="g-lib-title">Sheza&apos;s Bookshelf</h2>
            <p className="g-lib-sub">Pick a book to peek inside.</p>
            <div className="g-lib-case">
              {[0, 1, 2].map((s) => (
                <div className="g-lib-shelf" key={s}>
                  <div className="g-lib-row">
                    {BOOKS.filter((b) => b.shelf === s).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="g-lib-spine"
                        style={{
                          background: b.color,
                          color: b.ink,
                          height: b.height,
                        }}
                        aria-label={`${b.title}, ${b.author}`}
                        title={b.title}
                        onClick={() => openBook(b)}
                      >
                        <span className="g-lib-spine-emoji" aria-hidden="true">
                          {b.emoji}
                        </span>
                        <span className="g-lib-spine-title">{b.title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="g-lib-plank" />
                </div>
              ))}
            </div>
            <div className="g-lib-actions">
              <button type="button" className="g-lib-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className={`g-lib-reader${page === 0 ? " g-lib-is-cover" : ""}`}
            >
              {page === 0 ? (
                <div
                  className="g-lib-cover"
                  style={{ background: book.color, color: book.ink }}
                >
                  <span className="g-lib-cover-emoji" aria-hidden="true">
                    {book.emoji}
                  </span>
                  <h2 className="g-lib-cover-title">{book.title}</h2>
                  <p className="g-lib-cover-author">by {book.author}</p>
                  <p className="g-lib-cover-series">{book.series}</p>
                </div>
              ) : (
                <>
                  <div
                    className="g-lib-leaf g-lib-leaf-art"
                    aria-hidden="true"
                  >
                    <span className="g-lib-art-emoji">{book.emoji}</span>
                    <span className="g-lib-art-title">{book.title}</span>
                  </div>
                  <div className="g-lib-leaf g-lib-leaf-text">
                    <h3 className="g-lib-page-h">
                      {book.pages[page - 1].heading}
                    </h3>
                    <p className="g-lib-page-t">{book.pages[page - 1].text}</p>
                    <span className="g-lib-folio">
                      {page} / {last}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="g-lib-nav">
              <button
                type="button"
                className="g-lib-btn"
                onClick={() => goTo(page - 1)}
                disabled={page === 0}
                aria-label="Previous page"
              >
                ◀ Prev
              </button>
              <div className="g-lib-dots" role="group" aria-label="Pages">
                {Array.from({ length: last + 1 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`g-lib-dot${i === page ? " g-lib-dot-on" : ""}`}
                    aria-label={i === 0 ? "Cover" : `Page ${i}`}
                    aria-current={i === page ? "page" : undefined}
                    onClick={() => goTo(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="g-lib-btn"
                onClick={() => goTo(page + 1)}
                disabled={page === last}
                aria-label="Next page"
              >
                Next ▶
              </button>
            </div>
            <div className="g-lib-actions">
              <button type="button" className="g-lib-btn" onClick={backToShelf}>
                Back to shelf
              </button>
              <button type="button" className="g-lib-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
