import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import slugify from "slugify";
import { PrismaClient } from "../src/generated/prisma/client";
import { Status } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const posts = [
  {
    title: "Still Here, Still Grinding",
    category: "Devlog",
    status: Status.PUBLISHED,
    excerpt: "A quick update on where things stand this week.",
    content: `Work continues on the new build. Nothing flashy today, just a lot of
plumbing — but plumbing that makes everything after it easier.

## What shipped

- Fixed a stubborn layout bug in the sidebar
- Cleaned up the asset pipeline
- Wrote way too many tests for a Tuesday

More soon.`,
  },
  {
    title: "A New Corner of the Map",
    category: "Design",
    status: Status.PUBLISHED,
    excerpt: "Sketching out the next area, gothic-cozy style.",
    content: `Spent the week sketching a new area. Going for something that feels
lived-in — warm light spilling out of small windows, that kind of thing.

Here's a rough palette I'm testing:

- Deep near-black background
- Warm cream text
- A single muted gold accent

Feedback welcome, as always.`,
  },
  {
    title: "On Slow Progress",
    category: "Musings",
    status: Status.PUBLISHED,
    excerpt: "Some thoughts on why slow and steady still wins.",
    content: `It's tempting to want everything to move faster. But the parts of this
project I'm proudest of are the ones I let sit, revisited, and rebuilt twice.

Slow is fine. Slow that keeps moving is fine. Stopped is the only real problem.`,
  },
  {
    title: "Unfinished Thoughts on Combat",
    category: "Design",
    status: Status.DRAFT,
    excerpt: "Draft notes, not ready for prime time yet.",
    content: `Rough notes on a combat system idea. Not sharing this widely yet —
still working out whether it's fun or just complicated.

- Stamina bar instead of cooldowns?
- Parry window feels too generous
- Need to prototype before committing`,
  },
];

async function main() {
  for (const post of posts) {
    const slug = slugify(post.title, { lower: true, strict: true });
    await prisma.post.upsert({
      where: { slug },
      update: {},
      create: {
        ...post,
        slug,
        publishedAt: post.status === Status.PUBLISHED ? new Date() : null,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
