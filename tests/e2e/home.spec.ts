import { expect, test } from "@playwright/test";
import { enterAsVisitor, hold, walkUntilPrompt } from "./helpers";

test.describe("the Home", () => {
  test("walk in, cook from the recipe book, and the home gets cozier", async ({ page }) => {
    // Start with one meal cooked so the next one unlocks the first upgrade.
    await page.addInitScript(() => {
      localStorage.setItem("trail-home", JSON.stringify({ cooked: 1 }));
    });
    await enterAsVisitor(page, "Cook");

    // Outside: the Home door is straight above the campfire, so step round it.
    await walkUntilPrompt(
      page,
      [["d", 650]],
      /Go inside your home/,
      [["w", 160]],
    );
    await page.keyboard.press("Enter");
    await expect(page.locator(".g-map")).toHaveClass(/g-map-off/, { timeout: 10_000 });

    // Inside: go round the table to the stove.
    await walkUntilPrompt(
      page,
      [["d", 600], ["w", 1400], ["d", 900]],
      /Cook something/,
      [["d", 120]],
    );
    await page.keyboard.press("Enter");

    const book = page.getByRole("dialog", { name: "Recipe book" });
    await expect(book).toBeVisible();
    await expect(book).toContainText("Meals cooked: 1");
    await expect(book.locator("li button:disabled")).toHaveCount(2); // pie and stew are locked
    await book.getByRole("button", { name: /honey bread/ }).click();

    await expect(page.getByRole("status")).toContainText("You cooked honey bread", {
      timeout: 15_000,
    });
    await expect(page.getByRole("status")).toContainText("cozier");
    const saved = await page.evaluate(() => localStorage.getItem("trail-home"));
    expect(JSON.parse(saved ?? "{}").cooked).toBe(2);
  });

  test("the recipe book can be closed with Never mind", async ({ page }) => {
    await enterAsVisitor(page);
    await walkUntilPrompt(page, [["d", 650]], /Go inside your home/, [["w", 160]]);
    await page.keyboard.press("Enter");
    await expect(page.locator(".g-map")).toHaveClass(/g-map-off/, { timeout: 10_000 });
    await walkUntilPrompt(page, [["d", 600], ["w", 1400], ["d", 900]], /Cook something/, [["d", 120]]);
    await page.keyboard.press("Enter");
    const book = page.getByRole("dialog", { name: "Recipe book" });
    await expect(book).toBeVisible();
    await book.getByRole("button", { name: "Never mind" }).click();
    await expect(book).toHaveCount(0);
    // and we can walk again
    await hold(page, "s", 200);
  });
});
