import { expect, test } from "@playwright/test";
import { enterAsVisitor, gameMenu, openGate } from "./helpers";

test.describe("entry screen", () => {
  test("offers three doors", async ({ page }) => {
    await openGate(page);
    await expect(page.getByRole("button", { name: /Enter as Visitor/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Owner \(Sheza\)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Superadmin/ })).toBeVisible();
  });

  test("visitors choose between five characters and two shirt colours", async ({ page }) => {
    await openGate(page);
    await page.getByRole("button", { name: /Enter as Visitor/ }).click();
    for (const name of ["Farmer", "Bear", "Bunny", "Frog", "Chicken"]) {
      await expect(page.getByRole("radio", { name })).toBeVisible();
    }
    await expect(page.locator(".g-tint")).toHaveCount(2);
    // shirt colours only apply to the farmer
    await page.getByRole("radio", { name: "Bear" }).click();
    await expect(page.locator(".g-tint")).toHaveCount(0);
  });

  test("names that pose as the owner or are rude are refused", async ({ page }) => {
    await openGate(page);
    await page.getByRole("button", { name: /Enter as Visitor/ }).click();
    for (const bad of ["Fox", "Super Admin", "Sheza", "fuuuck"]) {
      await page.locator("#g-name").fill(bad);
      await page.getByRole("button", { name: /Let's go/ }).click();
      await expect(page.locator(".g-gate-err")).toBeVisible();
      await expect(page.locator(".g-gate")).toBeVisible();
    }
  });

  test("a visitor enters with a menu and music player that start minimized", async ({ page }) => {
    await enterAsVisitor(page, "Tester");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await expect(gameMenu(page).getByRole("link", { name: "About" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open music player" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chat" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in as Sheza or superadmin" })).toBeVisible();
  });

  test("visitors never see the Admin entry or superadmin buttons", async ({ page }) => {
    await enterAsVisitor(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = gameMenu(page);
    await expect(menu.getByRole("link", { name: "About" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Song" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Admin" })).toHaveCount(0);
    await expect(page.getByTitle("Fly (F)")).toHaveCount(0);
  });

  test("the entry screen comes back on every visit", async ({ page }) => {
    await enterAsVisitor(page);
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Welcome" })).toBeVisible();
  });

  test("the About popup has Sheza's text and closes with Escape", async ({ page }) => {
    await enterAsVisitor(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await gameMenu(page).getByRole("link", { name: "About" }).click();
    const dialog = page.getByRole("dialog", { name: "About" });
    await expect(dialog).toContainText("retro corner of the internet");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
