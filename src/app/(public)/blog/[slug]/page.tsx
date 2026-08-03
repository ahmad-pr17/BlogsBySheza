import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/CommentSection";
import { Panel } from "@/components/Panel";
import { PostEntry } from "@/components/PostEntry";
import { ReactionBar } from "@/components/ReactionBar";
import { getCommentsForPost } from "@/lib/comments";
import { getPublishedPostBySlug } from "@/lib/posts";
import { getReactionCounts } from "@/lib/reactionCounts";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) return {};

  return {
    title: `${post.title} — Sheza's Blogs`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) notFound();

  const [comments, reactionCounts] = await Promise.all([
    getCommentsForPost(post.id),
    getReactionCounts(post.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <PostEntry post={post} linkTitle={false} />

      <Panel>
        <p className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>
          What did you think?
        </p>
        <ReactionBar postId={post.id} initial={reactionCounts} />
      </Panel>

      <Panel>
        <CommentSection postId={post.id} initial={comments} />
      </Panel>
    </div>
  );
}
