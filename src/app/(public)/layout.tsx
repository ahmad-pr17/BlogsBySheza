import { Fireflies } from "@/components/Fireflies";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PageBackground } from "@/components/PageBackground";
import { getAllSongs } from "@/lib/songs";

// The header reads the current title style from the DB, so keep public pages
// dynamic — otherwise a prerendered page would show a stale wordmark.
export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const songs = await getAllSongs();

  return (
    <>
      <PageBackground />
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <FloatingPlayer songs={songs} />
      {/* Foreground fireflies drift over the content (never block clicks). */}
      <Fireflies
        count={16}
        seed={0xb17f001}
        sizeBoost={1}
        className="fireflies-front"
      />
    </>
  );
}
