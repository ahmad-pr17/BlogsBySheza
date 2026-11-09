import { expect, type Page, test } from "@playwright/test";
import { enterAsVisitor, hold } from "./helpers";

// Click a point in the game world (the camera follows the player, so work out
// where that point is on screen from where the player stands).
async function clickWorld(
  page: Page,
  world: { w: number; h: number },
  player: { x: number; y: number },
  at: { x: number; y: number },
) {
  const { width, height } = page.viewportSize()!;
  const S = width < 640 ? 2 : width < 1700 ? 3 : 4;
  const vw = width / S;
  const vh = height / S;
  const cam = (p: number, v: number, w: number) =>
    w <= v ? (w - v) / 2 : Math.min(Math.max(p - v / 2, 0), w - v);
  const sx = (at.x - cam(player.x, vw, world.w)) * S;
  const sy = (at.y - cam(player.y, vh, world.h)) * S;
  await page.mouse.click(sx, sy);
}

const TOWN = { w: 44 * 16, h: 1200 };
const ROOM = { w: 320, h: 240 };
const START = { x: 352, y: 200 }; // where you stand in the town at the start
const ROOM_START = { x: 160, y: 198 }; // where you appear inside a room

async function intoThePalace(page: Page) {
  // the palace door is straight above the start point
  await clickWorld(page, TOWN, START, { x: 352, y: 120 });
  await expect(page.locator(".g-map")).toHaveClass(/g-map-off/, { timeout: 20_000 });
}

async function intoTheKitchen(page: Page) {
  // the kitchen arch is on the left of the Great Hall's back wall
  await clickWorld(page, ROOM, ROOM_START, { x: 58, y: 74 });
  // you arrive by the kitchen door, which offers the way back
  await expect(page.locator(".g-prompt")).toContainText(/Back to the Great Hall/, { timeout: 25_000 });
  // now in the kitchen: the prep table is in the middle of the room
  await clickWorld(page, ROOM, ROOM_START, { x: 160, y: 150 });
}

test.describe("the Palace", () => {
  test("walk in, open the recipe book and start cooking", async ({ page }) => {
    // One meal cooked already, so the first few recipes are open.
    await page.addInitScript(() => {
      localStorage.setItem("trail-home", JSON.stringify({ cooked: 1 }));
    });
    await enterAsVisitor(page, "Cook");
    await intoThePalace(page);
    await intoTheKitchen(page);

    const book = page.getByRole("dialog", { name: "Recipe book" });
    await expect(book).toBeVisible({ timeout: 25_000 });
    await expect(book).toContainText("Meals cooked: 1");
    await expect(book.locator("li button:disabled")).toHaveCount(5); // the rest are still locked
    await book.getByRole("button", { name: /honey bread/ }).click();

    const game = page.getByRole("dialog", { name: /Cooking honey bread/ });
    await expect(game).toBeVisible();
    await game.getByRole("button", { name: "Quit" }).click();
    await expect(game).toHaveCount(0);
    // and we can walk again
    await hold(page, "s", 200);
  });

  test("the recipe book can be closed with Never mind", async ({ page }) => {
    await enterAsVisitor(page);
    await intoThePalace(page);
    await intoTheKitchen(page);
    const book = page.getByRole("dialog", { name: "Recipe book" });
    await expect(book).toBeVisible({ timeout: 25_000 });
    await book.getByRole("button", { name: "Never mind" }).click();
    await expect(book).toHaveCount(0);
    await hold(page, "s", 200);
  });
});
