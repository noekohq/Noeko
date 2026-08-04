import { test, expect, logIn } from "../support/fixtures";

test("protects authenticated routes and logs in through the UI", async ({ page }) => {
  await page.goto("/ideas");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Login to Noeko" })).toBeVisible();

  await logIn(page);

  await page.goto("/ideas");
  await expect(page).toHaveURL(/\/ideas$/);
  await expect(page.getByRole("heading", { name: "Your ideas" })).toBeVisible();
});
