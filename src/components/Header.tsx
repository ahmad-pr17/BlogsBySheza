import Link from "next/link";
import { Starfield } from "@/components/Starfield";
import { Wordmark } from "@/components/Wordmark";
import { getTitleStyle } from "@/lib/settings";

const NAV_LINKS = [
  { href: "/", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/admin", label: "Admin" },
];

export async function Header() {
  const titleStyle = await getTitleStyle();

  return (
    <header className="sky px-4 pt-12 pb-16">
      <Starfield />

      <div className="mx-auto max-w-3xl">
        <Link href="/" className="block">
          <Wordmark style={titleStyle} />
        </Link>

        <nav className="relative z-10 mt-4 -mb-9 flex justify-center">
          <div className="nav-inner">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <div className="mtn" />
    </header>
  );
}
