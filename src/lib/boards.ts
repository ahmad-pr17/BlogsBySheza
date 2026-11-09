import {
  BOARD_IDS,
  type BoardId,
  type BoardText,
  type BoardTexts,
  cleanBoard,
  DEFAULT_BOARDS,
} from "@/lib/boardText";
import { prisma } from "@/lib/db";

const keyFor = (id: BoardId) => `board.${id}`;

// What is on the boards now: the saved text, or the original words.
export async function getBoards(): Promise<BoardTexts> {
  const out: BoardTexts = { ...DEFAULT_BOARDS };
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: BOARD_IDS.map(keyFor) } },
    });
    for (const id of BOARD_IDS) {
      const row = rows.find((r) => r.key === keyFor(id));
      if (!row) continue;
      try {
        const saved = cleanBoard(JSON.parse(row.value));
        if (saved) out[id] = saved;
      } catch {
        /* a bad row falls back to the default */
      }
    }
  } catch {
    /* no database: show the defaults */
  }
  return out;
}

export async function saveBoard(id: BoardId, board: BoardText) {
  await prisma.setting.upsert({
    where: { key: keyFor(id) },
    create: { key: keyFor(id), value: JSON.stringify(board) },
    update: { value: JSON.stringify(board) },
  });
}
