// The words on the two notice boards at the start of the town. Sheza (owner)
// and the superadmin can edit them in the game; this file is shared by the
// server and the client, so it has no database code.

export type BoardId = "sorry" | "kind";
export type BoardText = { title: string; lines: string[] };
export type BoardTexts = Record<BoardId, BoardText>;

export const BOARD_IDS: BoardId[] = ["sorry", "kind"];
export const BOARD_LIMITS = { title: 16, lines: 6, lineLength: 46 };

export const DEFAULT_BOARDS: BoardTexts = {
  sorry: {
    title: "SORRY",
    lines: [
      "Sorry for making you feel ignored",
      "from my side.",
      "Sorry for anything I said or did that didn't",
      "feel right, or felt ignorant and rude,",
      "or anything bad.",
    ],
  },
  kind: {
    title: "REMEMBER",
    lines: [
      "It's normal to laugh when someone trips.",
      "It's okay to notice change in yourself.",
      "You are not toxic.",
      "Things take their own time and way.",
      "Believe and trust Allah.",
    ],
  },
};

export function isBoardId(v: unknown): v is BoardId {
  return v === "sorry" || v === "kind";
}

// Trim a board to what fits on it. Returns null if it is not a board at all.
export function cleanBoard(input: unknown): BoardText | null {
  if (!input || typeof input !== "object") return null;
  const { title, lines } = input as { title?: unknown; lines?: unknown };
  if (typeof title !== "string" || !Array.isArray(lines)) return null;
  const cleanLines = lines
    .filter((l): l is string => typeof l === "string")
    .map((l) => l.replace(/\s+/g, " ").trim().slice(0, BOARD_LIMITS.lineLength))
    .filter((l) => l.length > 0)
    .slice(0, BOARD_LIMITS.lines);
  const cleanTitle = title.replace(/\s+/g, " ").trim().slice(0, BOARD_LIMITS.title);
  if (!cleanTitle && cleanLines.length === 0) return null;
  return { title: cleanTitle, lines: cleanLines };
}
