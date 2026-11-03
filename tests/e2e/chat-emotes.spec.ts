import { expect, test } from "@playwright/test";
import { enterAsVisitor } from "./helpers";

test.describe("chat, emotes and sound", () => {
  test("chat sends a message and refuses links and rude words", async ({ page }) => {
    await enterAsVisitor(page);
    await page.keyboard.press("t"); // T opens the chat box
    const box = page.getByLabel("Chat message");
    await expect(box).toBeFocused();

    await box.fill("see www.spam.com");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText("Links are not allowed");

    await box.fill("what a f u c k");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText("friendly");

    await box.fill("Hello friends, lovely day!");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(box).toHaveValue("");
  });

  test("Escape closes the chat box", async ({ page }) => {
    await enterAsVisitor(page);
    await page.keyboard.press("t");
    await page.getByLabel("Chat message").press("Escape");
    await expect(page.getByLabel("Chat message")).toHaveCount(0);
  });

  test("the emoji panel has 24 emojis and three actions", async ({ page }) => {
    await enterAsVisitor(page);
    await page.getByRole("button", { name: "More emotes and actions" }).click();
    const panel = page.getByRole("group", { name: "More emotes and actions" });
    await expect(panel.locator(".g-emote-grid .g-emote")).toHaveCount(24);
    for (const name of ["Dance", "Jump", "Spin"]) {
      await expect(panel.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    }
    // choosing one closes the panel
    await panel.getByRole("button", { name: "Emote 😂" }).click();
    await expect(panel).toHaveCount(0);
  });

  test("the sound button and the M key switch sound on and off", async ({ page }) => {
    await enterAsVisitor(page);
    await page.getByRole("button", { name: "Turn sound off" }).click();
    await expect(page.getByRole("button", { name: "Turn sound on" })).toBeVisible();
    await page.keyboard.press("m");
    await expect(page.getByRole("button", { name: "Turn sound off" })).toBeVisible();
  });

  test("the players list says when nobody else is here", async ({ page }) => {
    await enterAsVisitor(page);
    await page.getByRole("button", { name: "Players online" }).click();
    await expect(page.getByRole("group", { name: "Players online" })).toContainText(
      "Nobody else is here right now",
    );
  });
});
