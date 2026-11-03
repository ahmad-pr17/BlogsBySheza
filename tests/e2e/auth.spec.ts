import { expect, test } from "@playwright/test";
import { gameMenu, openGate } from "./helpers";

test.describe("logins and roles", () => {
  test("a wrong owner password is refused", async ({ page }) => {
    await openGate(page);
    await page.getByRole("button", { name: /Owner \(Sheza\)/ }).click();
    await page.getByLabel(/Owner password/).fill("definitely-wrong");
    await page.getByRole("button", { name: /Log in/ }).click();
    await expect(page.locator(".g-gate-err")).toContainText("not right");
    await expect(page.locator(".g-gate")).toBeVisible();
  });

  test("a wrong superadmin password is refused", async ({ page }) => {
    await openGate(page);
    await page.getByRole("button", { name: /Superadmin/ }).click();
    await page.getByLabel(/Superadmin password/).fill("definitely-wrong");
    await page.getByRole("button", { name: /Log in/ }).click();
    await expect(page.locator(".g-gate-err")).toContainText(/not right|not set up/);
  });

  // Uses SUPERADMIN_PASSWORD from .env; skipped when it is not set.
  test("the superadmin is the fox with flying and admin access", async ({ page }) => {
    const password = process.env.SUPERADMIN_PASSWORD;
    test.skip(!password, "SUPERADMIN_PASSWORD is not set");

    await openGate(page);
    await page.getByRole("button", { name: /Superadmin/ }).click();
    await page.getByLabel(/Superadmin password/).fill(password!);
    await page.getByRole("button", { name: /Log in/ }).click();
    await expect(page.locator(".g-gate")).toHaveCount(0);

    await expect(page.locator(".g-title")).toContainText("Fox (superadmin)");
    await expect(page.getByTitle("Fly (F)")).toBeVisible();
    await expect(page.getByTitle(/Speed boost/)).toBeVisible();

    // the menu now has Admin, and the popup shows the admin dashboard
    await page.getByRole("button", { name: "Open menu" }).click();
    await gameMenu(page).getByRole("link", { name: "Admin" }).click();
    const frame = page.frameLocator("iframe.admin-frame");
    await expect(frame.getByText("Dashboard")).toBeVisible({ timeout: 60_000 });
    await page.keyboard.press("Escape");

    // F toggles flying
    await page.keyboard.press("f");
    await expect(page.getByTitle("Fly (F)")).toHaveAttribute("aria-pressed", "true");

    // logging out makes you a visitor again
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByTitle("Fly (F)")).toHaveCount(0);
    await expect(gameMenu(page).getByRole("link", { name: "Admin" })).toHaveCount(0);
  });
});

test.describe("server routes", () => {
  test("login routes refuse wrong passwords", async ({ request }) => {
    const owner = await request.post("/api/auth/login", { data: { password: "nope" } });
    expect(owner.status()).toBe(401);
    const sup = await request.post("/api/auth/superadmin", { data: { password: "nope" } });
    expect([401, 503]).toContain(sup.status());
  });

  test("moderation needs a login", async ({ request }) => {
    const res = await request.post("/api/realtime/moderate", {
      data: { target: "v:abcdefgh1234", minutes: 5 },
    });
    expect(res.status()).toBe(401);
  });

  test("asking for a role without the login cookie gives only a visitor identity", async ({
    request,
  }) => {
    for (const role of ["super", "owner"]) {
      const res = await request.get(`/api/realtime/token?id=abcdefgh1234&role=${role}`);
      if (res.status() === 503) continue; // multiplayer not configured on this machine
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.clientId).toBe("v:abcdefgh1234");
    }
  });

  test("the token route refuses a malformed id", async ({ request }) => {
    const res = await request.get("/api/realtime/token?id=bad!");
    expect([400, 503]).toContain(res.status());
  });

  test("the home page lists every post as a plain link for search engines", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect((html.match(/href="\/blog\//g) ?? []).length).toBeGreaterThan(0);
    // and the classic site's header has no Admin link for visitors
    const about = await (await request.get("/about")).text();
    expect(about).not.toContain('href="/admin"');
  });
});
