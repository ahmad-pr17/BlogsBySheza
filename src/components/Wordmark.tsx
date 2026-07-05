import { TITLE_EYEBROWS, type TitleStyle } from "@/lib/config";

export function Wordmark({ style }: { style: TitleStyle }) {
  return (
    <div className={`wordmark t-${style}`}>
      <div className="eyebrow">{TITLE_EYEBROWS[style]}</div>
      <div className="line1">Sheza&apos;s</div>
      <div className="line2">Blogs</div>
      {style === "c" && <div className="rule" />}
    </div>
  );
}
