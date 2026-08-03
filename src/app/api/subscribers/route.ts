import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public: subscribe an email to new/updated post notifications. Idempotent —
// subscribing an already-known address just succeeds.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  await prisma.subscriber.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
