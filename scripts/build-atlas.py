"""Pack the game's small sprites into one image (public/game/atlas.png) plus a
JSON map (public/game/atlas.json), so the browser makes 1 request instead of ~60.

Run after adding or changing anything in public/game/sprites/:

    python scripts/build-atlas.py

The sprite names come from the FILES list in src/components/game/art.ts.
"""
import json
import re
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
art = (root / "src/components/game/art.ts").read_text(encoding="utf-8")
block = re.search(r"const FILES = \[(.*?)\];", art, re.S).group(1)
names = re.findall(r'"([^"]+)"', block)

sprites = []
for n in names:
    im = Image.open(root / "public/game/sprites" / f"{n}.png").convert("RGBA")
    sprites.append((n, im))

# simple shelf packing, tallest first
sprites.sort(key=lambda s: -s[1].height)
MAX_W = 512
PAD = 1
x = y = row_h = 0
placed = {}
for n, im in sprites:
    if x + im.width + PAD > MAX_W:
        x, y, row_h = 0, y + row_h + PAD, 0
    placed[n] = (x, y, im.width, im.height)
    x += im.width + PAD
    row_h = max(row_h, im.height)
height = y + row_h

atlas = Image.new("RGBA", (MAX_W, height), (0, 0, 0, 0))
for n, im in sprites:
    px, py, _, _ = placed[n]
    atlas.paste(im, (px, py))

out = root / "public/game"
atlas.save(out / "atlas.png", optimize=True)
(out / "atlas.json").write_text(json.dumps(placed, separators=(",", ":")), encoding="utf-8")
print(f"{len(placed)} sprites -> atlas.png {MAX_W}x{height}")
