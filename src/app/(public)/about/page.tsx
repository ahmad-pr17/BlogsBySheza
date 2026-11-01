import type { Metadata } from "next";
import { AboutContent } from "@/components/AboutContent";

export const metadata: Metadata = {
  title: "About — Sheza's Blogs",
  description:
    "A retro space where Sheza lets her thoughts out: kind-hearted, caring, always thinking of others.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <AboutContent />
    </div>
  );
}
