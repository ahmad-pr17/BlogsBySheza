import slugify from "slugify";
import { prisma } from "@/lib/db";

export async function generateUniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title, { lower: true, strict: true }) || "post";
  let slug = base;
  let suffix = 2;

  while (
    await prisma.post.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix}`;
    suffix++;
  }

  return slug;
}
