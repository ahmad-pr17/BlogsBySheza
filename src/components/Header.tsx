import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { isAdminAuthenticated } from "@/lib/session";
import { getTitleStyle } from "@/lib/settings";

const NAV_LINKS = [
  { href: "/", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/song", label: "Song" },
];

export async function Header() {
  const titleStyle = await getTitleStyle();
  // The Admin link is only for the owner / superadmin; visitors never see it.
  const links = (await isAdminAuthenticated())
    ? [...NAV_LINKS, { href: "/admin", label: "Admin" }]
    : NAV_LINKS;

  return (
    <header className="sky px-4 pt-12 pb-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="block">
          <Wordmark style={titleStyle} />
        </Link>

        <nav className="relative z-10 mt-4 -mb-9 flex justify-center">
          <div className="nav-inner">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
