import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/** Everything the app under test needs; the database is wiped and re-seeded on each run. */
export const e2eEnv = {
  APP_ENV: "test",
  APP_URL: `http://localhost:${PORT}`,
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgresql://readyhire:readyhire@localhost:5432/readyhire_e2e",
  AUTH_SECRET: "readyhire-e2e-secret-not-for-production-use",
  STORAGE_DRIVER: "local",
  LOCAL_STORAGE_DIR: "./storage-e2e",
  EMAIL_DRIVER: "console",
  EMAIL_OUTBOX_FILE: "./.e2e/outbox.jsonl",
  CRON_SECRET: "readyhire-e2e-cron-secret",
};

/**
 * End-to-end tests for the core Readyhire flows against a production build.
 * Needs a Postgres database (E2E_DATABASE_URL, default readyhire_e2e on localhost).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `rm -rf .e2e storage-e2e && mkdir -p .e2e && npx prisma migrate deploy && npx prisma db seed && npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: e2eEnv,
  },
});
