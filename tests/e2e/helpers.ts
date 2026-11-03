import { expect, type Page } from "@playwright/test";

// The game's own menu (the classic site header is also in the page behind it).
export function gameMenu(page: Page) {
  return page.getByRole("navigation", { name: "Site" });
}

// Local development shares the live site's realtime channel, so the tests turn
// multiplayer off: nobody has to see fake test players walking around.
export async function blockRealtime(page: Page) {
  await page.route("**/api/realtime/token**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
}

export async function openGate(page: Page) {
  await blockRealtime(page);
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Welcome" })).toBeVisible();
}

export async function enterAsVisitor(page: Page, name = "") {
  await openGate(page);
  await page.getByRole("button", { name: /Enter as Visitor/ }).click();
  if (name) await page.locator("#g-name").fill(name);
  await page.getByRole("button", { name: /Let's go/ }).click();
  await expect(page.locator(".g-gate")).toHaveCount(0);
}

export async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

// Walk in small steps until the action button shows the wanted text.
export async function walkUntilPrompt(
  page: Page,
  steps: [string, number][],
  prompt: RegExp,
  nudge: [string, number][] = [],
) {
  for (const [key, ms] of steps) await hold(page, key, ms);
  const button = page.locator(".g-prompt");
  for (let i = 0; i < 12; i++) {
    if (await button.filter({ hasText: prompt }).count()) return;
    for (const [key, ms] of nudge) await hold(page, key, ms);
  }
  await expect(button).toContainText(prompt);
}
