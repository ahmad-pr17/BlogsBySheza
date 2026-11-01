// Hand-drawn indoor props for the Home, in the Sprout Lands palette (the pack
// has beds, chairs, rugs, lamps and so on, but no kitchen or bookshelf).

type Ctx = CanvasRenderingContext2D;
type Cv = HTMLCanvasElement;

function mk(w: number, h: number, draw: (c: Ctx) => void): Cv {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  draw(c);
  return cv;
}
const R = (c: Ctx, col: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};
function ell(c: Ctx, col: string, cx: number, cy: number, rx: number, ry: number) {
  for (let y = -ry; y <= ry; y++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    R(c, col, cx - hw, cy + y, hw * 2 + 1, 1);
  }
}

const OUT = "#4a2f22";
const WOOD_D = "#795e53";
const WOOD = "#aa7959";
const WOOD_L = "#d79e61";
const WOOD_HI = "#eec58f";
const IRON = "#474a4b";
const IRON_L = "#656a6b";
const SHADOW = "rgba(53,55,56,0.22)";

function counterBase(c: Ctx) {
  // 32 x 24 wooden cabinet: lit top, two doors
  R(c, OUT, 0, 4, 32, 20);
  R(c, WOOD_HI, 1, 5, 30, 3);
  R(c, WOOD_L, 1, 8, 30, 1);
  R(c, WOOD, 1, 9, 30, 14);
  R(c, WOOD_D, 15, 9, 2, 14);
  R(c, WOOD_L, 3, 11, 10, 10);
  R(c, WOOD_L, 19, 11, 10, 10);
  R(c, WOOD, 4, 12, 8, 8);
  R(c, WOOD, 20, 12, 8, 8);
  R(c, WOOD_HI, 12, 15, 1, 3);
  R(c, WOOD_HI, 19, 15, 1, 3);
  R(c, WOOD_D, 1, 22, 30, 1);
}

export function homeProps(): Record<string, Cv | Cv[]> {
  const dish = (soup: string, bits: string[]) =>
    mk(12, 9, (c) => {
      ell(c, SHADOW, 6, 8, 5, 1);
      R(c, OUT, 1, 3, 10, 5);
      R(c, "#f3e5c2", 2, 4, 8, 3);
      R(c, OUT, 2, 7, 8, 1);
      R(c, soup, 2, 3, 8, 2);
      bits.forEach((b, i) => R(c, b, 3 + i * 2, 2, 2, 2));
      R(c, "#ffffff", 3, 5, 2, 1);
    });

  const cat = (up: number) =>
    mk(16, 12, (c) => {
      ell(c, SHADOW, 8, 11, 7, 1);
      ell(c, OUT, 8, 7 - up, 7, 4);
      ell(c, "#e3a15c", 8, 7 - up, 6, 3);
      R(c, "#c9803e", 4, 5 - up, 2, 4);
      R(c, "#c9803e", 8, 4 - up, 2, 4);
      R(c, "#f7ebaa", 10, 7 - up, 4, 2);
      // head tucked in at the right, eyes shut
      ell(c, OUT, 12, 6 - up, 3, 3);
      ell(c, "#e3a15c", 12, 6 - up, 2, 2);
      R(c, OUT, 10, 2 - up, 2, 3);
      R(c, OUT, 13, 2 - up, 2, 3);
      R(c, "#e3a15c", 11, 3 - up, 1, 2);
      R(c, "#e3a15c", 14, 3 - up, 1, 2);
      R(c, OUT, 11, 6 - up, 2, 1);
      R(c, "#d98f8a", 13, 7 - up, 1, 1);
    });

  return {
    stove: mk(32, 30, (c) => {
      ell(c, SHADOW, 16, 28, 14, 2);
      // iron body
      R(c, OUT, 1, 9, 30, 20);
      R(c, IRON, 2, 10, 28, 18);
      R(c, IRON_L, 2, 10, 28, 3);
      R(c, "#353738", 2, 26, 28, 2);
      // firebox
      R(c, OUT, 7, 15, 18, 11);
      R(c, "#2a1812", 8, 16, 16, 9);
      R(c, "#e8913a", 11, 21, 10, 4);
      R(c, "#f7c453", 13, 22, 6, 3);
      R(c, IRON_L, 7, 15, 18, 1);
      // knobs
      R(c, "#bd757e", 4, 12, 3, 2);
      R(c, "#bd757e", 25, 12, 3, 2);
      // pot on the hob
      R(c, OUT, 8, 1, 16, 10);
      R(c, "#353738", 9, 2, 14, 8);
      R(c, "#5f6465", 9, 2, 14, 2);
      R(c, "#7a7f80", 10, 2, 5, 1);
      R(c, OUT, 6, 4, 3, 2);
      R(c, OUT, 23, 4, 3, 2);
      // chimney pipe
      R(c, IRON, 27, 0, 3, 9);
      R(c, IRON_L, 27, 0, 1, 9);
    }),
    counter: mk(32, 24, (c) => {
      counterBase(c);
      // loaf + cutting board on top
      R(c, WOOD_D, 3, 3, 12, 3);
      R(c, "#e8b66a", 4, 0, 9, 4);
      R(c, "#c98f58", 4, 0, 9, 1);
      R(c, "#f7ebaa", 6, 1, 1, 1);
      // fruit bowl
      R(c, OUT, 19, 2, 9, 4);
      R(c, "#a35b70", 20, 3, 7, 2);
      R(c, "#bd757e", 20, 0, 3, 3);
      R(c, "#78a158", 23, 1, 3, 2);
      R(c, "#e8b66a", 25, 0, 2, 2);
    }),
    counterSink: mk(32, 24, (c) => {
      counterBase(c);
      R(c, OUT, 5, 3, 14, 4);
      R(c, "#7fb7d6", 6, 4, 12, 2);
      R(c, "#b8dcee", 7, 4, 4, 1);
      R(c, IRON_L, 22, 0, 2, 5);
      R(c, IRON_L, 20, 0, 4, 1);
      R(c, IRON_L, 20, 0, 1, 2);
      // a stack of plates
      R(c, OUT, 25, 3, 6, 3);
      R(c, "#f3e5c2", 26, 3, 4, 2);
    }),
    shelf: mk(32, 38, (c) => {
      ell(c, SHADOW, 16, 36, 14, 2);
      R(c, OUT, 0, 0, 32, 37);
      R(c, WOOD_D, 1, 1, 30, 35);
      R(c, "#4a3228", 3, 3, 26, 9);
      R(c, "#4a3228", 3, 14, 26, 9);
      R(c, "#4a3228", 3, 25, 26, 9);
      R(c, WOOD, 1, 12, 30, 2);
      R(c, WOOD, 1, 23, 30, 2);
      R(c, WOOD_L, 1, 1, 30, 1);
      const cols = ["#bd757e", "#7180b1", "#78a158", "#e8b66a", "#a35b70", "#4a588e", "#d79e61", "#67835c"];
      [3, 14, 25].forEach((y0, row) => {
        let x = 4;
        let i = row * 3;
        while (x < 27) {
          const w = 2 + ((i * 7) % 3);
          const h = 5 + ((i * 5) % 4);
          R(c, cols[i % cols.length], x, y0 + 9 - h, w, h);
          R(c, "rgba(255,255,255,0.25)", x, y0 + 9 - h, 1, h);
          x += w + 1;
          i++;
        }
      });
      // a little plant on the top shelf end
      R(c, "#aa7959", 24, 6, 4, 3);
      R(c, "#78a158", 24, 3, 4, 3);
    }),
    cushion: mk(22, 10, (c) => {
      ell(c, OUT, 11, 5, 10, 4);
      ell(c, "#bd757e", 11, 5, 9, 3);
      ell(c, "#d99aa0", 11, 4, 6, 2);
      R(c, "#f7ebaa", 11, 4, 1, 1);
    }),
    mat: mk(28, 12, (c) => {
      R(c, OUT, 0, 1, 28, 10);
      R(c, "#a35b70", 1, 2, 26, 8);
      R(c, "#d99aa0", 3, 3, 22, 6);
      R(c, "#a35b70", 5, 5, 18, 2);
      for (let x = 0; x < 28; x += 3) {
        R(c, "#a35b70", x, 0, 1, 1);
        R(c, "#a35b70", x, 11, 1, 1);
      }
    }),
    cat0: cat(0),
    cat1: cat(1),
    dishStew: dish("#b0623a", ["#78a158", "#e8b66a", "#c9803e"]),
    dishBread: dish("#e8b66a", ["#f7ebaa", "#d79e61"]),
    dishPie: dish("#bd757e", ["#a35b70", "#f7ebaa"]),
    dishSoup: dish("#78a158", ["#e8b66a", "#bd757e", "#f7ebaa"]),
  };
}
