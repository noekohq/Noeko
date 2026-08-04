import { test, expect, logIn } from "../support/fixtures";
import { E2E_BACKEND_URL } from "../support/constants";

test("creates, edits, persists, and reloads an idea", async ({ page }) => {
  const title = "E2E persistence check";
  const body = "This text crossed the collaboration WebSocket and survived a reload.";

  await logIn(page);

  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "Idea", exact: true }).click();
  await expect(page).toHaveURL(/\/idea\/idea:/);

  const ideaId = decodeURIComponent(new URL(page.url()).pathname.split("/").at(-1) ?? "");
  expect(ideaId).toMatch(/^idea:/);

  const titleEditor = page.locator('h1[contenteditable="true"]');
  await expect(titleEditor).toHaveText("Untitled Idea");
  await expect(page.getByText("All changes saved")).toBeVisible();

  const titleUpdate = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" && response.url().includes(`/api/ideas/${ideaId}`)
  );
  await titleEditor.fill(title);
  await titleEditor.blur();
  await titleUpdate;

  const editor = page.locator('.tippy-editor[contenteditable="true"]');
  await editor.fill(body);

  await expect
    .poll(async () => {
      const response = await page.request.get(
        `${E2E_BACKEND_URL}/api/ideas/${encodeURIComponent(ideaId)}`
      );
      const payload = await response.json();
      return {
        status: response.status(),
        title: payload.data?.title,
        content: payload.data?.content,
      };
    })
    .toEqual({
      status: 200,
      title,
      content: expect.stringContaining(body),
    });

  await page.reload();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".tippy-editor")).toContainText(body);
});
