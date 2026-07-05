import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { isAdminAuthenticated } from "@/lib/session";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authed = await isAdminAuthenticated();

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-surface/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-baseline gap-2">
            <Link href="/admin" className="font-semibold text-heading">
              Sheza&apos;s Blogs
            </Link>
            <span className="text-xs tracking-widest text-foreground/40 uppercase">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            {authed && (
              <>
                <Link
                  href="/admin"
                  className="text-foreground/60 transition-colors hover:text-accent"
                >
                  Posts
                </Link>
                <Link
                  href="/admin/settings"
                  className="text-foreground/60 transition-colors hover:text-accent"
                >
                  Appearance
                </Link>
              </>
            )}
            <Link
              href="/"
              className="text-foreground/60 transition-colors hover:text-accent"
            >
              View site ↗
            </Link>
            {authed && <LogoutButton />}
          </div>
        </div>
      </div>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
