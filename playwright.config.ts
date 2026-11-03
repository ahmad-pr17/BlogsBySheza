import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";

// Passwords for the optional login tests come from .env (never committed).
dotenv.config({ path: ".env", quiet: true });

// Uses the Chrome (or Edge) already installed on this computer, so nothing
// extra is downloaded. Set E2E_BROWSER=msedge to use Edge instead.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 150_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    channel: process.env.E2E_BROWSER ?? "chrome",
    viewport: { width: 1024, height: 768 },
    trace: "retain-on-failure",
  },
  // Re-uses the dev server if it is already running.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
