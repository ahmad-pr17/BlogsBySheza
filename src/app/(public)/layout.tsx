import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

// The header reads the current title style from the DB, so keep public pages
// dynamic — otherwise a prerendered page would show a stale wordmark.
export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </>
  );
}
