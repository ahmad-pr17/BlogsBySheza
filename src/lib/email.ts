// Email sending via Brevo's transactional API (https://developers.brevo.com).
// We call the HTTP endpoint directly with fetch so there's no extra dependency.
//
// Brevo's free tier (300 emails/day) sends to ANY recipient once you verify a
// single sender email — no domain purchase required (unlike Resend).
//
// Configured entirely through env vars — if BREVO_API_KEY or EMAIL_FROM are
// missing, every send here becomes a logged no-op, so the app works fine in
// development and before the key is added.
//
//   BREVO_API_KEY — from Brevo → SMTP & API → API Keys
//   EMAIL_FROM    — verified sender, e.g. "Sheza's Blogs <you@example.com>"
//                   (the address must be a verified sender in Brevo)
//   OWNER_EMAIL   — where new-comment notifications go (the blog owner)
//   SITE_URL      — public base URL, used to build post + unsubscribe links

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export function emailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

// Splits an "EMAIL_FROM" string into Brevo's { name, email } sender shape.
// Accepts either "Name <addr@example.com>" or a bare "addr@example.com".
function parseSender(raw: string): { name?: string; email: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1] || undefined, email: match[2].trim() };
  }
  return { email: raw.trim() };
}

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
};

async function send({ to, subject, html }: SendArgs): Promise<boolean> {
  if (!emailConfigured()) {
    console.warn(
      `[email] skipped "${subject}" — BREVO_API_KEY / EMAIL_FROM not set.`,
    );
    return false;
  }

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({
    email,
  }));

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseSender(process.env.EMAIL_FROM as string),
        to: recipients,
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] Brevo responded ${res.status}: ${detail}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- notification builders -------------------------------------------------

type PostLike = { title: string; slug: string; excerpt: string | null };

export async function notifyOwnerOfComment(
  post: PostLike,
  comment: { author: string; body: string },
): Promise<void> {
  const owner = process.env.OWNER_EMAIL;
  if (!owner) {
    console.warn("[email] no OWNER_EMAIL set — comment notification skipped.");
    return;
  }

  const url = `${siteUrl()}/blog/${post.slug}#comments`;
  await send({
    to: owner,
    subject: `New comment on "${post.title}"`,
    html: `
      <h2>New comment on "${escapeHtml(post.title)}"</h2>
      <p><strong>${escapeHtml(comment.author)}</strong> wrote:</p>
      <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">
        ${escapeHtml(comment.body)}
      </blockquote>
      <p><a href="${url}">View the comment</a></p>
    `,
  });
}

type Subscriber = { email: string; token: string };

function subscriberEmailHtml(
  post: PostLike,
  sub: Subscriber,
  kind: "new" | "updated",
): string {
  const postUrl = `${siteUrl()}/blog/${post.slug}`;
  const unsubUrl = `${siteUrl()}/unsubscribe?token=${encodeURIComponent(sub.token)}`;
  const lead =
    kind === "new"
      ? "A new post is up on Sheza's Blogs:"
      : "A post you follow on Sheza's Blogs was updated:";

  return `
    <p>${lead}</p>
    <h2><a href="${postUrl}">${escapeHtml(post.title)}</a></h2>
    ${post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : ""}
    <p><a href="${postUrl}">Read it here</a></p>
    <hr />
    <p style="font-size:12px;color:#888">
      You're getting this because you subscribed to Sheza's Blogs.
      <a href="${unsubUrl}">Unsubscribe</a>.
    </p>
  `;
}

// Sends one email per subscriber (so each gets its own unsubscribe link).
// Failures for individual recipients don't abort the rest.
export async function notifySubscribersOfPost(
  post: PostLike,
  subscribers: Subscriber[],
  kind: "new" | "updated",
): Promise<void> {
  if (subscribers.length === 0) return;

  const subject =
    kind === "new"
      ? `New post: ${post.title}`
      : `Updated: ${post.title}`;

  await Promise.allSettled(
    subscribers.map((sub) =>
      send({
        to: sub.email,
        subject,
        html: subscriberEmailHtml(post, sub, kind),
      }),
    ),
  );
}
