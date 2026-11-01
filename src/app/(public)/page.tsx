import Link from "next/link";
import { GameWorld } from "@/components/game/GameWorld";
import { PostWithComments } from "@/components/PostWithComments";
import { SubscribeForm } from "@/components/SubscribeForm";
import { getCommentsByPost } from "@/lib/comments";
import { formatPostDate } from "@/lib/format";
import { getPublishedPosts } from "@/lib/posts";
import { getAllSongs } from "@/lib/songs";
import { AboutContent } from "@/components/AboutContent";
import { SongContent } from "@/components/SongContent";
import { getReactionCountsByPost } from "@/lib/reactionCounts";
import { REACTION_EMOJIS, type ReactionCounts } from "@/lib/reactions";

export const dynamic = "force-dynamic";

// Fallback for a post with no reactions yet (all zeros).
const EMPTY_COUNTS = Object.fromEntries(
  REACTION_EMOJIS.map((e) => [e, 0]),
) as ReactionCounts;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { view, post: postParam, page: pageParam } = await searchParams;
  const listView = view === "list";
  const initialSlug = typeof postParam === "string" ? postParam : undefined;
  const initialPage =
    pageParam === "about" || pageParam === "song" || pageParam === "admin"
      ? pageParam
      : undefined;

  const posts = await getPublishedPosts();
  const postIds = posts.map((p) => p.id);
  const [commentsByPost, reactionsByPost] = await Promise.all([
    getCommentsByPost(postIds),
    getReactionCountsByPost(postIds),
  ]);

  const renderPost = (post: (typeof posts)[number]) => (
    <PostWithComments
      key={post.id}
      post={post}
      comments={commentsByPost.get(post.id) ?? []}
      reactionCounts={reactionsByPost.get(post.id) ?? EMPTY_COUNTS}
    />
  );

  if (posts.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <p className="text-center text-foreground/60">
          No posts yet. Check back soon.
        </p>
      </div>
    );
  }

  if (listView) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <p className="mb-8 text-center text-sm">
          <Link
            href="/"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            🎮 Walk the trail instead
          </Link>
        </p>
        <div className="flex flex-col gap-12">{posts.map(renderPost)}</div>
      </div>
    );
  }

  // Server-render every post once and hand the nodes to the client game, which
  // decides which one to show in the modal.
  const nodes: Record<string, React.ReactNode> = Object.fromEntries(
    posts.map((p) => [p.slug, renderPost(p)]),
  );
  nodes.__about = <AboutContent />;
  nodes.__song = <SongContent songs={await getAllSongs()} />;
  // The admin site lives in a frame so its own login and pages work unchanged.
  nodes.__admin = (
    <iframe src="/admin" title="Admin" className="admin-frame" />
  );
  nodes.__subscribe = (
    <div className="mx-auto w-full max-w-md rounded-xl border-4 border-wood bg-night/95 p-6">
      <h2 className="mb-3 text-center text-xl font-semibold text-heading">
        📬 The mailbox
      </h2>
      <SubscribeForm />
    </div>
  );
  const stops = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: formatPostDate(p.publishedAt ?? p.createdAt),
    category: p.category,
  }));

  // The game is fixed full-screen, covering the header and footer.
  return (
    <GameWorld
      stops={stops}
      nodes={nodes}
      initialSlug={initialSlug}
      initialPage={initialPage}
    />
  );
}
