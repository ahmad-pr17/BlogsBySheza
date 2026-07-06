import { SongManager } from "@/components/admin/SongManager";
import { getSongs } from "@/lib/songs";

export const dynamic = "force-dynamic";

export default async function AdminSongsPage() {
  const songs = await getSongs();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-heading">Songs</h1>
      <p className="mb-8 text-sm text-foreground/60">
        Upload songs here. Anything you add appears on the public Song page with
        a mute/unmute control, alongside the default track.
      </p>
      <SongManager initial={songs} />
    </div>
  );
}
