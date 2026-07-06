import { BackgroundPicker } from "@/components/admin/BackgroundPicker";
import { TitleStylePicker } from "@/components/admin/TitleStylePicker";
import { getBackgroundConfig, getTitleStyle } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [titleStyle, background] = await Promise.all([
    getTitleStyle(),
    getBackgroundConfig(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-heading">Appearance</h1>
      <p className="mb-8 text-sm text-foreground/60">
        Pick the wordmark shown in the site header. Changes apply immediately.
      </p>
      <TitleStylePicker current={titleStyle} />

      <h2 className="mt-12 mb-2 text-xl font-bold text-heading">Background</h2>
      <p className="mb-6 text-sm text-foreground/60">
        Choose the page background. The starfield always stays on top.
      </p>
      <BackgroundPicker current={background} />
    </div>
  );
}
