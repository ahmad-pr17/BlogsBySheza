import type { Metadata } from "next";
import { Panel } from "@/components/Panel";

export const metadata: Metadata = {
  title: "About — Sheza's Blogs",
  description: "About Sheza's Blogs.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <Panel>
        <h1 className="text-2xl font-semibold sm:text-3xl" style={{ color: "var(--ink)" }}>
          About
        </h1>
        <div
          className="mt-5 space-y-4 leading-relaxed"
          style={{ color: "var(--ink-body)" }}
        >
          <p>
            Sheza&apos;s Blogs is a dev log — notes on what&apos;s being built,
            why it&apos;s taking so long, and the occasional detour into
            design, art, and the odd musing along the way.
          </p>
          <p>
            New posts show up here as they&apos;re published. Thanks for
            reading.
          </p>
        </div>
      </Panel>
    </div>
  );
}
