import type { Metadata } from "next";
import { Panel } from "@/components/Panel";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe — Sheza's Blogs",
  robots: { index: false },
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;

  let message: string;
  if (!token) {
    message = "This unsubscribe link is missing its token.";
  } else {
    // Idempotent: deleting an unknown/already-removed token is fine.
    const result = await prisma.subscriber.deleteMany({ where: { token } });
    message =
      result.count > 0
        ? "You've been unsubscribed. You won't get any more emails from Sheza's Blogs."
        : "You're already unsubscribed — nothing more to do.";
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <Panel>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>
          Unsubscribe
        </h1>
        <p className="mt-4" style={{ color: "var(--ink-body)" }}>
          {message}
        </p>
      </Panel>
    </div>
  );
}
