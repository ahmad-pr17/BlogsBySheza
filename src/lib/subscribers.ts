import { prisma } from "@/lib/db";
import { notifySubscribersOfPost } from "@/lib/email";

type PostLike = { title: string; slug: string; excerpt: string | null };

// Loads every subscriber and emails them about a post. Wrapped so a mail
// failure never breaks the admin action that triggered it.
export async function announceToSubscribers(
  post: PostLike,
  kind: "new" | "updated",
): Promise<void> {
  try {
    const subscribers = await prisma.subscriber.findMany({
      select: { email: true, token: true },
    });
    await notifySubscribersOfPost(
      { title: post.title, slug: post.slug, excerpt: post.excerpt },
      subscribers,
      kind,
    );
  } catch (err) {
    console.error("[subscribers] announce failed:", err);
  }
}
