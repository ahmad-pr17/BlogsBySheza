import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.song.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Best-effort cleanup of the underlying Blob file.
  if (existing.url.includes("blob.vercel-storage.com")) {
    await del(existing.url).catch(() => {});
  }

  await prisma.song.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
