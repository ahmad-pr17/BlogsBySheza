// Visitor names are shown to everyone online, so keep them short and tidy.

export const MAX_NAME = 14;

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i",
};

// Common profanity (names and chat messages).
const PROFANITY = [
  "fuck", "shit", "bitch", "cunt", "pussy", "slut", "whore", "nigg", "fag",
  "rape", "nazi", "hitler", "porn", "penis", "vagina", "asshole", "retard",
  "bastard", "wank", "twat", "dickhead", "blowjob",
];
// Names only: do not pose as the owner or the superadmin.
const RESERVED = ["admin", "sheza", "owner", "moderator"];
const collapse = (w: string) => w.replace(/(.)\1+/g, "$1");
const BAD = [...RESERVED, ...PROFANITY].map(collapse);
const BAD_MESSAGE = PROFANITY.map(collapse);

export function cleanName(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _.'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
}

function squash(name: string) {
  return name
    .toLowerCase()
    .split("")
    .map((ch) => LEET[ch] ?? ch)
    .join("")
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1+/g, "$1"); // "fuuuck" -> "fuck"
}

// null when the name is fine, otherwise a friendly reason.
export function nameProblem(clean: string): string | null {
  if (!clean) return null; // empty means "give me a random name"
  if (clean.length < 2) return "Names need at least 2 characters.";
  const s = squash(clean);
  if (s === "fox" || s === "thefox") return "Please choose a different name."; // the superadmin
  if (BAD.some((w) => s.includes(w))) return "Please choose a different name.";
  return null;
}

// Names arriving from other players: same rules, fall back to "Visitor".
export function cleanRemoteName(raw: unknown): string {
  const clean = cleanName(String(raw ?? ""));
  return clean && !nameProblem(clean) ? clean : "Visitor";
}

// ---- chat messages ----
export const MAX_MESSAGE = 60;

export function cleanMessage(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE);
}

// null when the message is fine, otherwise a friendly reason.
export function messageProblem(clean: string): string | null {
  if (!clean) return "Type a message first.";
  if (/https?:|www\.|\.(com|net|org|io|ly|me|xyz|gg)\b/i.test(clean)) return "Links are not allowed here.";
  if (BAD_MESSAGE.some((w) => squash(clean).includes(w))) return "Please keep it friendly.";
  return null;
}

// Messages arriving from other players: same rules, dropped if they fail.
export function cleanRemoteMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const clean = cleanMessage(raw);
  return clean && !messageProblem(clean) ? clean : null;
}
