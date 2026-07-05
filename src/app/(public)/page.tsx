import { PostEntry } from "@/components/PostEntry";
import { getPublishedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      {posts.length === 0 ? (
        <p className="text-center text-foreground/60">
          No posts yet. Check back soon.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {posts.map((post) => (
            <PostEntry key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
