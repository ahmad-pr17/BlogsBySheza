import { TitleStylePicker } from "@/components/admin/TitleStylePicker";
import { getTitleStyle } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const titleStyle = await getTitleStyle();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-heading">Appearance</h1>
      <p className="mb-8 text-sm text-foreground/60">
        Pick the wordmark shown in the site header. Changes apply immediately.
      </p>
      <TitleStylePicker current={titleStyle} />
    </div>
  );
}
