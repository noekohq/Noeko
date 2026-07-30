import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test as base, expect, type Page } from "@playwright/test";
import { E2E_USER } from "./constants";

const execFileAsync = promisify(execFile);

export const resetE2EDatabase = async () => {
  await execFileAsync("bun", ["--env-file=.env.e2e", "scripts/e2e/reset.ts"], {
    cwd: process.cwd(),
  });
};

export const logIn = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_USER.email);
  await page.getByLabel("Password").fill(E2E_USER.password);
  await page.getByRole("button", { name: "Login", exact: true }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText(`Welcome back ${E2E_USER.firstName}!`)).toBeVisible();
};

export const test = base.extend<{ resetDatabase: void }>({
  resetDatabase: [
    async ({ browser: _browser }, use) => {
      void _browser;
      await resetE2EDatabase();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
