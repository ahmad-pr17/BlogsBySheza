import { PostForm } from "@/components/admin/PostForm";

export default function NewPostPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-bold text-heading">New Post</h1>
      <PostForm mode="new" />
    </div>
  );
}
