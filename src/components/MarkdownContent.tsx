import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const headingStyle = { color: "var(--content-heading)" };
const bodyStyle = { color: "var(--content-body)" };
const linkStyle = { color: "var(--content-link)" };

const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-8 mb-3 text-2xl font-semibold" style={headingStyle}>
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-8 mb-3 text-xl font-semibold" style={headingStyle}>
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-6 mb-2 text-lg font-semibold" style={headingStyle}>
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-relaxed" style={bodyStyle}>
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <Link
      href={href ?? "#"}
      className="underline underline-offset-2 hover:opacity-80"
      style={linkStyle}
    >
      {children}
    </Link>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1 pl-6" style={bodyStyle}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1 pl-6" style={bodyStyle}>
      {children}
    </ol>
  ),
  blockquote: ({ children }) => (
    <blockquote
      className="mb-4 border-l-2 pl-4 italic"
      style={{ ...bodyStyle, borderColor: "var(--content-link)" }}
    >
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code
      className="rounded px-1.5 py-0.5 text-sm"
      style={{ ...bodyStyle, background: "var(--content-code-bg)" }}
    >
      {children}
    </code>
  ),
  // Image sources come from free-form Markdown content, so we can't
  // pre-configure remote domains for next/image.
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        className="mb-4 rounded"
        style={{ border: "1px solid var(--content-link)" }}
      />
    ) : null,
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
