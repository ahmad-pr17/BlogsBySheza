import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-4xl font-bold text-heading">404</h1>
      <p className="mt-4 text-foreground/70">
        This page doesn&apos;t exist, or it hasn&apos;t been published yet.
      </p>
      <Link
        href="/"
        className="mt-6 text-accent underline underline-offset-2 hover:text-accent-hover"
      >
        Back to the blog
      </Link>
    </div>
  );
}
