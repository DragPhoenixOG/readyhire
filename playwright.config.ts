import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/**
 * End-to-end tests for the core Readyhire flows. They run against their own SQLite
 * database and upload folder, re-seeded on every run, so your dev data is untouched.
 * Stop `npm run dev` first: Next.js allows one dev server per project folder.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx prisma migrate deploy && npx prisma db seed && npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "file:./prisma/e2e.db",
      UPLOAD_DIR: "./uploads-e2e",
      AUTH_SECRET: "readyhire-e2e-secret-not-for-production",
    },
  },
});
