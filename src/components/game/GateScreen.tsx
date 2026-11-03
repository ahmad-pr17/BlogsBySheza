"use client";

import { useEffect, useRef, useState } from "react";
import type { Art } from "@/components/game/art";
import {
  DEFAULT_CHOICE,
  FARMER_TINTS,
  isKind,
  OWNER_CHOICE,
  VISITOR_CHARS,
  type CharKind,
  type Choice,
} from "@/components/game/characters";
import { cleanName, MAX_NAME, nameProblem } from "@/components/game/names";

const CHAR_KEY = "trail-character";
const OWNER_CHAR_KEY = "trail-owner-character";

type Mode = "choose" | "pick" | "owner" | "super" | "ownerPick";

// The picture of a character on the entry screen (front-facing, standing).
function CharPreview({ art, kind, tint }: { art: Art | null; kind: CharKind; tint: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c || !art) return;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 16, 32);
    const sheet = art.chars[kind]?.[tint] ?? art.chars[kind]?.[0];
    if (sheet) c.drawImage(sheet, 4 * 16, 32, 16, 32, 0, 0, 16, 32);
  }, [art, kind, tint]);
  return <canvas ref={ref} width={16} height={32} className="g-char-prev" aria-hidden="true" />;
}

// The entry screen: Visitor (pick a character and a name), Owner (Sheza) and
// Superadmin. It keeps its own state and only tells the game what happened.
export function GateScreen({
  art,
  relogin,
  onCancel,
  onVisitor,
  onLoggedIn,
  onOwnerStart,
}: {
  art: Art | null;
  relogin: boolean; // opened later from inside the game (no Visitor door)
  onCancel: () => void; // keep playing as a visitor (only when relogin)
  onVisitor: (choice: Choice, name: string) => void;
  onLoggedIn: (role: "owner" | "super") => void; // the password was accepted
  onOwnerStart: (choice: Choice) => void; // Sheza picked her character
}) {
  const [mode, setMode] = useState<Mode>("choose");
  const [choice, setChoice] = useState<Choice>(DEFAULT_CHOICE);
  const [ownerChoice, setOwnerChoice] = useState<Choice>(OWNER_CHOICE);
  const [nameInput, setNameInput] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Remember the last character and name picked on this device.
  const restoreChoice = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAR_KEY) ?? "null");
      if (saved && isKind(saved.kind) && saved.kind !== "fox") {
        setChoice({
          kind: saved.kind,
          tint: Math.abs(Number(saved.tint) || 0) % FARMER_TINTS,
        });
        if (typeof saved.name === "string") setNameInput(cleanName(saved.name));
      }
    } catch {
      /* ignore */
    }
  };

  const startAsVisitor = () => {
    const name = cleanName(nameInput);
    const problem = nameProblem(name);
    if (problem) {
      setNameErr(problem);
      return;
    }
    try {
      localStorage.setItem(CHAR_KEY, JSON.stringify({ ...choice, name }));
    } catch {
      /* ignore */
    }
    onVisitor(choice, name);
  };

  const startAsOwner = () => {
    try {
      localStorage.setItem(OWNER_CHAR_KEY, JSON.stringify(ownerChoice));
    } catch {
      /* ignore */
    }
    onOwnerStart(ownerChoice);
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(mode === "super" ? "/api/auth/superadmin" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        setErr(
          res.status === 401
            ? "That password is not right."
            : res.status === 429
              ? "Too many tries. Please wait a few minutes."
              : res.status === 503
                ? "This login is not set up yet."
                : "Could not log in. Try again.",
        );
      } else {
        setPw("");
        if (mode === "super") {
          onLoggedIn("super");
        } else {
          // Sheza picks how she looks before walking in
          try {
            const saved = JSON.parse(localStorage.getItem(OWNER_CHAR_KEY) ?? "null");
            if (saved && (saved.kind === "farmer" || saved.kind === "bear")) {
              setOwnerChoice({
                kind: saved.kind,
                tint: saved.kind === "farmer" ? Math.abs(Number(saved.tint) || 0) % 3 : 0,
              });
            }
          } catch {
            /* ignore */
          }
          onLoggedIn("owner");
          setMode("ownerPick");
        }
      }
    } catch {
      setErr("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="g-gate" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="g-gate-card">
        <p className="g-gate-kicker">the writings of</p>
        <h1 className="g-gate-title">Sheza&apos;s Town</h1>
        <p className="g-gate-sub">A little retro space where thoughts walk around. Come on in.</p>

        {mode === "ownerPick" ? (
          <form
            className="g-pick"
            onSubmit={(e) => {
              e.preventDefault();
              startAsOwner();
            }}
          >
            <p className="g-pick-title">Welcome, Sheza! Choose your character</p>
            <div className="g-pick-grid g-pick-two" role="radiogroup" aria-label="Character">
              {(["farmer", "bear"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={ownerChoice.kind === k}
                  className={`g-pick-card${ownerChoice.kind === k ? " on" : ""}`}
                  onClick={() =>
                    setOwnerChoice({ kind: k, tint: k === "farmer" ? ownerChoice.tint : 0 })
                  }
                >
                  <CharPreview art={art} kind={k} tint={k === "farmer" ? ownerChoice.tint : 0} />
                  <span>{k === "farmer" ? "Farmer" : "Bear"}</span>
                </button>
              ))}
            </div>
            {ownerChoice.kind === "farmer" && (
              <div className="g-pick-tints" role="radiogroup" aria-label="Shirt colour">
                {[2, 0, 1].map((i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={ownerChoice.tint === i}
                    aria-label={["Yellow", "Sky blue", "Pink"][i] + " shirt"}
                    className={`g-tint t${i}${ownerChoice.tint === i ? " on" : ""}`}
                    onClick={() => setOwnerChoice({ kind: "farmer", tint: i })}
                  />
                ))}
              </div>
            )}
            <div className="g-gate-btns">
              <button type="submit" className="g-gate-btn g-gate-primary" disabled={!art}>
                {art ? "▶ Let's go" : "Loading…"}
              </button>
            </div>
          </form>
        ) : mode === "pick" ? (
          <form
            className="g-pick"
            onSubmit={(e) => {
              e.preventDefault();
              startAsVisitor();
            }}
          >
            <p className="g-pick-title">Choose your character</p>
            <div className="g-pick-grid" role="radiogroup" aria-label="Character">
              {VISITOR_CHARS.map((c) => (
                <button
                  key={c.kind}
                  type="button"
                  role="radio"
                  aria-checked={choice.kind === c.kind}
                  className={`g-pick-card${choice.kind === c.kind ? " on" : ""}`}
                  onClick={() =>
                    setChoice({ kind: c.kind, tint: c.kind === "farmer" ? choice.tint : 0 })
                  }
                >
                  <CharPreview art={art} kind={c.kind} tint={c.kind === "farmer" ? choice.tint : 0} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
            {choice.kind === "farmer" && (
              <div className="g-pick-tints" role="radiogroup" aria-label="Shirt colour">
                {Array.from({ length: FARMER_TINTS }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={choice.tint === i}
                    aria-label={`Shirt colour ${i + 1}`}
                    className={`g-tint t${i}${choice.tint === i ? " on" : ""}`}
                    onClick={() => setChoice({ kind: "farmer", tint: i })}
                  />
                ))}
              </div>
            )}
            <label className="g-name-label" htmlFor="g-name">
              Your name <span>(optional)</span>
            </label>
            <input
              id="g-name"
              className="g-name"
              type="text"
              value={nameInput}
              maxLength={MAX_NAME}
              placeholder="Pick a name, or get a random one"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setNameInput(e.target.value);
                setNameErr(null);
              }}
            />
            {nameErr && <p className="g-gate-err">{nameErr}</p>}
            <div className="g-gate-btns">
              <button type="submit" className="g-gate-btn g-gate-primary" disabled={!art}>
                {art ? "▶ Let's go" : "Loading…"}
              </button>
              <button type="button" className="g-gate-btn" onClick={() => setMode("choose")}>
                Back
              </button>
            </div>
          </form>
        ) : mode === "choose" ? (
          <div className="g-gate-btns">
            {!relogin && (
              <button
                type="button"
                className="g-gate-btn g-gate-primary"
                onClick={() => {
                  restoreChoice();
                  setMode("pick");
                }}
              >
                🌱 Enter as Visitor
              </button>
            )}
            <button type="button" className="g-gate-btn" onClick={() => setMode("owner")}>
              🌸 Owner (Sheza)
            </button>
            <button type="button" className="g-gate-btn" onClick={() => setMode("super")}>
              👑 Superadmin
            </button>
            {relogin && (
              <button type="button" className="g-gate-btn" onClick={onCancel}>
                ← Keep playing as a visitor
              </button>
            )}
          </div>
        ) : (
          <form className="g-gate-form" onSubmit={login}>
            <label htmlFor="g-pw">
              {mode === "super" ? "Superadmin password" : "Owner password (Sheza)"}
            </label>
            <input
              id="g-pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
            {err && <p className="g-gate-err">{err}</p>}
            <div className="g-gate-btns">
              <button
                type="submit"
                className="g-gate-btn g-gate-primary"
                disabled={busy || !pw}
              >
                🔑 {busy ? "Checking…" : "Log in"}
              </button>
              <button
                type="button"
                className="g-gate-btn"
                onClick={() => {
                  setMode("choose");
                  setErr(null);
                }}
              >
                Back
              </button>
            </div>
          </form>
        )}

        <p className="g-gate-note">
          {relogin
            ? "Sign in to unlock the admin tools."
            : "Visitors can read every post. Others who are online will see you walking around."}
        </p>
      </div>
    </div>
  );
}
