import Ably from "ably";

// Tell everyone who is online that something on the site changed (a post, a
// song, a comment), so their game fetches the new content by itself instead of
// waiting for a reload. Sent as the reserved sender "server:mod", so visitors
// cannot fake it. Never throws: the change itself is already saved.
export type ContentKind = "posts" | "songs" | "comments";

export async function announceChange(kind: ContentKind) {
  const key = process.env.ABLY_API_KEY;
  if (!key) return;
  try {
    await new Ably.Rest({ key }).channels.get("town").publish({
      name: "content",
      data: { kind },
      clientId: "server:mod",
    });
  } catch {
    /* people just see it on their next visit */
  }
}
