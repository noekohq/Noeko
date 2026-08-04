import { defineConfig, devices } from "@playwright/test";

const frontendUrl = "http://localhost:5174";
const backendUrl = "http://localhost:3027";

export default defineConfig({
  testDir: "./e2e/specs",
  outputDir: "./test-results/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      name: "api",
      command: "bun --env-file=.env.e2e app/index.ts",
      url: `${backendUrl}/api/healthcheck`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      name: "client",
      command: "bun --env-file=.env.e2e run dev:client -- --port 5174",
      url: frontendUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
