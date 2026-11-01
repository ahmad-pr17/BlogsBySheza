import { Panel } from "@/components/Panel";

// Shared by the /about route and the game's About popup.
export function AboutContent() {
  return (
    <Panel>
      <h1 className="text-2xl font-semibold sm:text-3xl" style={{ color: "var(--ink)" }}>
        About
      </h1>
      <div
        className="mt-5 space-y-4 leading-relaxed"
        style={{ color: "var(--ink-body)" }}
      >
        <p>
          Welcome to Sheza&apos;s little retro corner of the internet: a space
          where she lets her thoughts out, one post at a time.
        </p>
        <p>
          Sheza is kind-hearted and caring, the sort of person who is always
          thinking of others. The posts here are her way of putting feelings,
          stories and quiet musings into words.
        </p>
        <p>
          Wander the town, read what she has written, and stay as long as you
          like. Thank you for stopping by.
        </p>
      </div>
    </Panel>
  );
}
