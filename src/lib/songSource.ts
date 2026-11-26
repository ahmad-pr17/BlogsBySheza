// Where a song comes from. A song's `url` is stored as one of:
//   https://...            a direct audio file (an upload, or a Jamendo stream)
//   /songs/...             the track that ships with the site
//   youtube:VIDEOID        played with YouTube's embedded player
//   soundcloud:https://... played with SoundCloud's embedded player
// so no database change is needed to add new kinds of source.

export type SongKind = "file" | "youtube" | "soundcloud";

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function songKind(url: string): { kind: SongKind; ref: string } {
  if (url.startsWith("youtube:")) return { kind: "youtube", ref: url.slice(8) };
  if (url.startsWith("soundcloud:")) return { kind: "soundcloud", ref: url.slice(11) };
  return { kind: "file", ref: url };
}

export const KIND_LABEL: Record<SongKind, string> = {
  file: "Audio file",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
};

// The 11-character id out of any usual YouTube link, or null.
export function youtubeId(input: string): string | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/);
      id = m?.[1] ?? null;
    }
  }
  return id && YT_ID.test(id) ? id : null;
}

export function isSoundcloudLink(input: string): boolean {
  try {
    const u = new URL(input.trim());
    const host = u.hostname.replace(/^(www|m)\./, "");
    return u.protocol === "https:" && (host === "soundcloud.com" || host === "on.soundcloud.com") && u.pathname.length > 1;
  } catch {
    return false;
  }
}

// Turn whatever was pasted into the form stored in the database, or null if it
// is not something we can play.
export function normalizeSongLink(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (/^youtube:[A-Za-z0-9_-]{11}$/.test(text)) return text;
  const yt = youtubeId(text);
  if (yt) return `youtube:${yt}`;
  if (text.startsWith("soundcloud:")) return isSoundcloudLink(text.slice(11)) ? text : null;
  if (isSoundcloudLink(text)) return `soundcloud:${text}`;
  if (text.startsWith("/songs/")) return text;
  try {
    const u = new URL(text);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
