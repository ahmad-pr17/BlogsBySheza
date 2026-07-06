import { StickerManager } from "@/components/admin/StickerManager";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminStickersPage() {
  const stickers = await prisma.sticker.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-heading">Stickers</h1>
      <p className="mb-8 text-sm text-foreground/60">
        Upload your curated retro pack here. Anything you add appears in the
        editor’s sticker picker, alongside GIF search.
      </p>
      <StickerManager initial={stickers} />
    </div>
  );
}
