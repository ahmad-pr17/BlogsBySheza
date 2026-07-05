export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="mx-auto max-w-3xl px-6 py-8 text-center font-mono text-xs text-foreground/50">
        © {year} Sheza&apos;s Blogs
      </div>
    </footer>
  );
}
