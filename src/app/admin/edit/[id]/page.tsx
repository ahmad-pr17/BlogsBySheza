import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-bold text-heading">Edit Post</h1>
      <PostForm mode="edit" post={post} />
    </div>
  );
}
