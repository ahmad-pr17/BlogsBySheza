import { PostWithComments } from "@/components/PostWithComments";
import { getCommentsByPost } from "@/lib/comments";
import { getPublishedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await getPublishedPosts();
  const commentsByPost = await getCommentsByPost(posts.map((p) => p.id));

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
