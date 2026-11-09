"use client";

// The "How to play" corner.
export function HelpPanel({
  open,
  onToggle,
  touch,
  canAdmin,
  admin,
}: {
  open: boolean;
  onToggle: () => void;
  touch: boolean;
  canAdmin: boolean; // owner or superadmin
  admin: boolean; // superadmin
}) {
  return (
    <aside className={`g-help${touch ? " g-help-touch" : ""}`}>
      <button type="button" className="g-help-toggle" aria-expanded={open} onClick={onToggle}>
        {open ? "✕" : "?"} <span>How to play</span>
      </button>
      {open && (
        <ul>
          {touch ? (
            <>
              <li>🕹️ Hold the stick to walk</li>
              <li>👆 Tap a sign or house to go there</li>
              <li>📜 Tap the button to open it</li>
            </>
          ) : (
            <>
              <li>⌨️ WASD / arrows to walk</li>
              <li>↵ Enter or E to open a sign</li>
              <li>🖱️ Click to walk or pick a sign</li>
            </>
          )}
          <li>
            🏘️ Town: {canAdmin ? "About · Home · Admin · Jukebox" : "About · Home · Jukebox"}
          </li>
          <li>🏰 Palace: cook, watch TV, read in the study, sleep upstairs</li>
          <li>🎣 Click a pond to go fishing</li>
          <li>😊 Emotes: buttons or keys 1-4, actions 5-7</li>
          <li>💬 Chat: press T · 🔊 Sound: press M</li>
          {admin && <li>👑 F: fly · Shift: speed · click the map to teleport</li>}
          <li>🪧 Each sign down the trail is a post</li>
          <li>🗺️ The map shows where you are</li>
        </ul>
      )}
    </aside>
  );
}
