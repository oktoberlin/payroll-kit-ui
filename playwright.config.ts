import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a real API seeded with seed_demo.
 *   1. start the API:  DJANGO_DEBUG=1 THROTTLE_TOKEN=1000/min python manage.py runserver 127.0.0.1:8000
 *   2. run:            E2E_BACKEND_DIR=../backend npm run test:e2e     (reseeds the demo data first)
 * The suite changes data (it pays a run), so it reseeds when E2E_BACKEND_DIR is set.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3040",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3040/login", reuseExistingServer: true, timeout: 120_000 },
});
