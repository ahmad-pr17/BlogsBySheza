import { Fireflies } from "@/components/Fireflies";
import { Starfield } from "@/components/Starfield";
import { resolveBackground } from "@/lib/settings";

// A single fixed, full-viewport layer that sits behind all page content.
// Layering (back to front): the image (or the body's night-sky gradient when
// there's none) -> optional legibility scrim -> starfield -> generated
// mountains (theme mode only). The starfield always renders on top.
export async function PageBackground() {
  const bg = await resolveBackground();

  return (
    <div className="page-bg" aria-hidden="true">
      {bg.src && (
        <div
          className="page-bg-img"
          style={{ backgroundImage: `url("${bg.src}")` }}
        />
      )}
      {bg.scrim && <div className="page-bg-scrim" />}
      <Starfield />
      <Fireflies count={34} seed={0x1eff1e5} />
      {bg.mountains && <div className="page-mtn" />}
    </div>
  );
}
