"use client";

import type { RefObject } from "react";
import { MAX_MESSAGE } from "@/components/game/names";
import type { PlayerInfo } from "@/components/game/multiplayer";

// Quick emotes (keys 1-4), more in the panel, and body actions (keys 5-7).
export const QUICK = ["👋", "❤", "♪", "💤"];
const MORE_EMOJI = [
  ...QUICK,
  "😂", "😮", "😢", "😡", "😍", "😎", "👍", "👎", "🎉", "✨",
  "❓", "❗", "🔥", "🌸", "🍪", "☕", "🌙", "⭐", "🎵", "💭",
];
export const ACTIONS: { k: string; icon: string; label: string }[] = [
  { k: "!dance", icon: "💃", label: "Dance" },
  { k: "!jump", icon: "🦘", label: "Jump" },
  { k: "!spin", icon: "🔄", label: "Spin" },
];

// The bar along the bottom: chat, sound, who is online, emojis and actions,
// plus the log in / log out and superadmin buttons.
export function HudBar({
  touch,
  admin,
  canAdmin,
  chat,
  chatInputRef,
  sound,
  playersPanel,
  emotes,
  flyUi,
  boostUi,
  onFly,
  onBoost,
  onLogin,
  onLogout,
}: {
  touch: boolean;
  admin: boolean; // superadmin
  canAdmin: boolean; // owner or superadmin
  chat: {
    open: boolean;
    text: string;
    onToggle: () => void;
    onText: (t: string) => void;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
  };
  chatInputRef: RefObject<HTMLInputElement | null>; // to focus the box when it opens
  sound: { muted: boolean; onToggle: () => void };
  playersPanel: {
    open: boolean;
    players: PlayerInfo[];
    onToggle: () => void;
    onMute: (p: PlayerInfo) => void;
    onSilence: (p: PlayerInfo, minutes: number) => void;
  };
  emotes: {
    open: boolean;
    onToggle: () => void;
    onClose: () => void;
    onSend: (k: string) => void;
  };
  flyUi: boolean;
  boostUi: boolean;
  onFly: () => void;
  onBoost: () => void;
  onLogin: () => void;
  onLogout: () => void;
}) {
  return (
    <div className={`g-bar${touch ? " g-bar-touch" : ""}`}>
      <button
        type="button"
        className={`g-emote g-more${chat.open ? " on" : ""}`}
        onClick={chat.onToggle}
        aria-expanded={chat.open}
        aria-label="Chat"
        title="Chat (T)"
      >
        💬
      </button>
      <button
        type="button"
        className="g-emote"
        onClick={sound.onToggle}
        aria-label={sound.muted ? "Turn sound on" : "Turn sound off"}
        title="Sound (M)"
      >
        {sound.muted ? "🔇" : "🔊"}
      </button>
      <button
        type="button"
        className={`g-emote g-more${playersPanel.open ? " on" : ""}`}
        onClick={playersPanel.onToggle}
        aria-expanded={playersPanel.open}
        aria-label="Players online"
        title="Who is online"
      >
        👥
      </button>
      {playersPanel.open && (
        <div className="g-emote-panel g-players" role="group" aria-label="Players online">
          <p className="g-players-title">Online now</p>
          <ul>
            {playersPanel.players.length === 0 && (
              <li className="g-players-empty">Nobody else is here right now.</li>
            )}
            {playersPanel.players.map((p) => (
              <li key={p.id}>
                <span className="g-pl-name">
                  {p.role === "super" ? "★ " : p.role === "owner" ? "♥ " : ""}
                  {p.name}
                </span>
                <button type="button" onClick={() => playersPanel.onMute(p)}>
                  {p.muted ? "🔇 Unmute" : "🔊 Mute"}
                </button>
                {canAdmin && p.role === "visitor" && (
                  <button type="button" onClick={() => playersPanel.onSilence(p, p.silenced ? 0 : 10)}>
                    {p.silenced ? "Lift silence" : "⛔ Silence 10 min"}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="g-players-note">
            Mute only hides someone for you.
            {canAdmin ? " Silence hides them for everyone." : ""}
          </p>
        </div>
      )}
      <button
        type="button"
        className={`g-emote g-more${emotes.open ? " on" : ""}`}
        onClick={emotes.onToggle}
        aria-expanded={emotes.open}
        aria-label="More emotes and actions"
        title="More emotes and actions"
      >
        {emotes.open ? "✕" : "😊"}
      </button>
      {chat.open && (
        <form className="g-chat" onSubmit={chat.onSubmit}>
          <input
            ref={chatInputRef}
            type="text"
            value={chat.text}
            maxLength={MAX_MESSAGE}
            onChange={(e) => chat.onText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                chat.onClose();
                e.currentTarget.blur();
              }
            }}
            placeholder="Say something nice…"
            aria-label="Chat message"
            autoComplete="off"
            enterKeyHint="send"
          />
          <button type="submit" className="g-chat-send" disabled={!chat.text.trim()}>
            Send
          </button>
        </form>
      )}
      {emotes.open && (
        <div className="g-emote-panel" role="group" aria-label="More emotes and actions">
          <div className="g-emote-grid">
            {MORE_EMOJI.map((k) => (
              <button
                key={k}
                type="button"
                className="g-emote"
                onClick={() => {
                  emotes.onSend(k);
                  emotes.onClose();
                }}
                aria-label={`Emote ${k}`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="g-action-row">
            {ACTIONS.map((a, i) => (
              <button
                key={a.k}
                type="button"
                className="g-action"
                onClick={() => {
                  emotes.onSend(a.k);
                  emotes.onClose();
                }}
                title={`${a.label} (${i + 5})`}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {admin && (
        <>
          <button
            type="button"
            className={`g-emote g-super${flyUi ? " on" : ""}`}
            onClick={onFly}
            aria-pressed={flyUi}
            title="Fly (F)"
          >
            🕊️
          </button>
          <button
            type="button"
            className={`g-emote g-super${boostUi ? " on" : ""}`}
            onClick={onBoost}
            aria-pressed={boostUi}
            title="Speed boost (hold Shift)"
          >
            ⚡
          </button>
        </>
      )}
      {!canAdmin && (
        <button
          type="button"
          className="g-emote"
          onClick={onLogin}
          title="Log in as Sheza or superadmin"
          aria-label="Log in as Sheza or superadmin"
        >
          🔑
        </button>
      )}
      {canAdmin && (
        <button
          type="button"
          className="g-emote g-super"
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
        >
          🚪
        </button>
      )}
    </div>
  );
}
