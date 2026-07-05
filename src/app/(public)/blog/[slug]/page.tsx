import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEntry } from "@/components/PostEntry";
import { getPublishedPostBySlug } from "@/lib/posts";

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

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <PostEntry post={post} linkTitle={false} />
    </div>
  );
}
