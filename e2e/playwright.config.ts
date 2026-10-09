import { defineConfig } from "@playwright/test";

const API_PORT = process.env.E2E_API_PORT || "4600";
const APP_PORT = process.env.E2E_APP_PORT || "5180";

export default defineConfig({
  testDir: "./tests",
  // Os cenários compartilham usuários e dados criados em sequência.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    // Localmente dá para usar o Edge/Chrome instalados (PW_CHANNEL=msedge); no CI usa o Chromium do Playwright.
    channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node scripts/start-backend.mjs",
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { E2E_API_PORT: API_PORT, E2E_APP_PORT: APP_PORT },
    },
    {
      command: `npm run dev --prefix ../frontend -- --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
    },
  ],
});
