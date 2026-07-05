import { Status } from "@/generated/prisma/enums";

export function StatusBadge({ status }: { status: Status }) {
  const isPublished = status === Status.PUBLISHED;

  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium tracking-wide uppercase ${
        isPublished
          ? "bg-accent/20 text-accent"
          : "bg-foreground/10 text-foreground/60"
      }`}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}
