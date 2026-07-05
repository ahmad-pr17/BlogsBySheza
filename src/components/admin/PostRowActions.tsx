"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Status } from "@/generated/prisma/enums";

export function PostRowActions({
  id,
  status,
}: {
  id: string;
  status: Status;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function togglePublish() {
    setBusy(true);
    const nextStatus =
      status === Status.PUBLISHED ? Status.DRAFT : Status.PUBLISHED;

    await fetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    router.refresh();
    setBusy(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;

    setBusy(true);
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        type="button"
        disabled={busy}
        onClick={togglePublish}
        className="text-accent hover:text-accent-hover disabled:opacity-50"
      >
        {status === Status.PUBLISHED ? "Unpublish" : "Publish"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={handleDelete}
        className="text-red-400 hover:text-red-300 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
