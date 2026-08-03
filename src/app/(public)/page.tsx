import { PostWithComments } from "@/components/PostWithComments";
import { getCommentsByPost } from "@/lib/comments";
import { getPublishedPosts } from "@/lib/posts";
import { getReactionCountsByPost } from "@/lib/reactionCounts";
import { REACTION_EMOJIS, type ReactionCounts } from "@/lib/reactions";

export const dynamic = "force-dynamic";

// Fallback for a post with no reactions yet (all zeros).
const EMPTY_COUNTS = Object.fromEntries(
  REACTION_EMOJIS.map((e) => [e, 0]),
) as ReactionCounts;

export default async function Home() {
  const posts = await getPublishedPosts();
  const postIds = posts.map((p) => p.id);
  const [commentsByPost, reactionsByPost] = await Promise.all([
    getCommentsByPost(postIds),
    getReactionCountsByPost(postIds),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      {posts.length === 0 ? (
        <p className="text-center text-foreground/60">
          No posts yet. Check back soon.
        </p>
      ) : (
        <div className="flex flex-col gap-12">
          {posts.map((post) => (
            <PostWithComments
              key={post.id}
              post={post}
              comments={commentsByPost.get(post.id) ?? []}
              reactionCounts={reactionsByPost.get(post.id) ?? EMPTY_COUNTS}
            />
          ))}
        </div>
      )}
    </div>
  );
}
