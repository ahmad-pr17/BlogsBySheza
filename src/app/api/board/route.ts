import Ably from "ably";
import { NextResponse } from "next/server";
import { cleanBoard, isBoardId } from "@/lib/boardText";
import { saveBoard } from "@/lib/boards";
import { notifyOwnerOfBoardChange } from "@/lib/email";
import { isAdminAuthenticated, isSuperAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

// Owner / superadmin only: change the words on a notice board in the town.
// Everyone online sees the change straight away (a message from the reserved
// sender "server:mod", like silencing), and everyone else on their next visit.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const board = cleanBoard(body?.board);
  if (!isBoardId(body?.id) || !board) {
    return NextResponse.json({ error: "Bad board" }, { status: 400 });
  }

  await saveBoard(body.id, board);

  // tell the owner address(es) by email (only them, never the subscribers)
  const editor = (await isSuperAuthenticated()) ? "Fox (superadmin)" : "Sheza";
  await notifyOwnerOfBoardChange(body.id === "sorry" ? "sorry" : "reminders", board, editor).catch(() => {});

  const key = process.env.ABLY_API_KEY;
  if (key) {
    try {
      await new Ably.Rest({ key }).channels.get("town").publish({
        name: "board",
        data: { id: body.id, board },
        clientId: "server:mod",
      });
    } catch {
      /* the change is saved; live players just see it on their next visit */
    }
  }
  return NextResponse.json({ success: true, board });
}
