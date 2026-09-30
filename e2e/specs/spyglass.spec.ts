import { test, expect, logIn } from "../support/fixtures";
import { E2E_BACKEND_URL } from "../support/constants";

test("streams a cited Deep Focus answer, saves it, and replays it from history", async ({
  page,
}) => {
  const query = "How does the Lighthouse learning loop work?";
  const ideaTitle = "The Lighthouse learning loop";
  const ideaContent =
    "The Lighthouse learning loop uses deliberate practice and weekly reflection.";

  await logIn(page);

  const createIdea = await page.request.post(`${E2E_BACKEND_URL}/api/ideas`, {
    data: {
      title: ideaTitle,
      content: ideaContent,
      visibility: "private",
    },
  });
  expect(createIdea.status()).toBe(200);

  await page.goto("/spyglass");
  await page.getByText("Deep Focus", { exact: true }).click();
  await page.getByPlaceholder("Ask your thoughts anything...").fill(query);

  const runResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url() === `${E2E_BACKEND_URL}/api/search/spyglass/runs`
  );
  await page.getByRole("button", { name: "Submit query" }).click();

  expect((await runResponse).status()).toBe(202);
  await expect(
    page.getByText(/practical way to improve through deliberate practice/)
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "1", exact: true })).toBeVisible();

  await expect
    .poll(async () => {
      const response = await page.request.get(
        `${E2E_BACKEND_URL}/api/search/spyglass/history/light?page=1&pageSize=10`
      );
      const payload = await response.json();
      return payload.data?.history?.find(
        (record: { baseQuery: string; isDeepAnalysis: boolean }) =>
          record.baseQuery === query && record.isDeepAnalysis
      );
    })
    .toBeTruthy();

  await page.goto("/spyglass/history");
  await expect(page.getByRole("heading", { name: "Spyglass History" })).toBeVisible();
  await expect(page.getByText(`"${query}"`, { exact: true })).toBeVisible();
  await expect(page.getByText("Deep Focus", { exact: true })).toBeVisible();

  await page.getByText(`"${query}"`, { exact: true }).click();
  await expect(page).toHaveURL(/\/spyglass\?run=spyglass_run%3A/);
  await expect(page.getByRole("heading", { name: query })).toBeVisible();
  await expect(
    page.getByText(/practical way to improve through deliberate practice/)
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "1", exact: true })).toBeVisible();
});

test("streams a Glimpse map and saves it to history", async ({ page }) => {
  const query = "Map the Lighthouse learning loop";

  await logIn(page);

  const createIdea = await page.request.post(`${E2E_BACKEND_URL}/api/ideas`, {
    data: {
      title: "The Lighthouse learning loop",
      content: "The Lighthouse learning loop uses deliberate practice and weekly reflection.",
      visibility: "private",
    },
  });
  expect(createIdea.status()).toBe(200);

  await page.goto("/spyglass");
  await page.getByPlaceholder("Ask your thoughts anything...").fill(query);
  await page.getByRole("button", { name: "Submit query" }).click();

  await expect(page.getByRole("heading", { name: query })).toBeVisible();
  await expect(page.getByText("1 resource analyzed")).toBeVisible();
  await expect(page.getByText("Deterministic response").first()).toBeVisible();

  await expect
    .poll(async () => {
      const response = await page.request.get(
        `${E2E_BACKEND_URL}/api/search/spyglass/history/light?page=1&pageSize=10`
      );
      const payload = await response.json();
      return payload.data?.history?.find(
        (record: { baseQuery: string; isDeepAnalysis: boolean }) =>
          record.baseQuery === query && !record.isDeepAnalysis
      );
    })
    .toBeTruthy();

  await page.getByRole("button", { name: "New query" }).click();
  await expect(page.getByPlaceholder("Ask your thoughts anything...")).toBeVisible();
  await expect(page.getByText(query, { exact: true })).toBeVisible();
  await expect(page.getByText("Glimpse", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Open run: ${query}` }).click();
  await expect(page).toHaveURL(/\/spyglass\/records\/spyglass_record:/);
  await page.getByRole("link", { name: "New query" }).click();
  await expect(page).toHaveURL(/\/spyglass$/);
  await expect(page.getByPlaceholder("Ask your thoughts anything...")).toBeVisible();
});

test("returns to a durable Deep Focus run from the Spyglass landing page", async ({ page }) => {
  const query = "Reconnect to this durable Lighthouse report";

  await logIn(page);
  const createIdea = await page.request.post(`${E2E_BACKEND_URL}/api/ideas`, {
    data: {
      title: "Durable Lighthouse notes",
      content: "Durable workers preserve reports when a browser disconnects.",
      visibility: "private",
    },
  });
  expect(createIdea.status()).toBe(200);

  await page.route(
    `${E2E_BACKEND_URL}/api/search/spyglass/runs/*/events?after=0`,
    (route) => route.abort("connectionfailed"),
    { times: 1 }
  );
  await page.goto("/spyglass");
  await page.getByText("Deep Focus", { exact: true }).click();
  await page.getByPlaceholder("Ask your thoughts anything...").fill(query);
  const accepted = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url() === `${E2E_BACKEND_URL}/api/search/spyglass/runs`
  );
  await page.getByRole("button", { name: "Submit query" }).click();
  expect((await accepted).status()).toBe(202);
  await expect(page).toHaveURL(/\/spyglass\?run=spyglass_run%3A/);
  await expect(page.getByText("Could not complete this analysis")).toBeVisible();

  await page.goto("/");
  await page.goto("/spyglass");
  await expect(page.getByText(query, { exact: true })).toBeVisible();
  await page
    .getByRole("button", {
      name: new RegExp(`(Resume|Open) run: ${query}`),
    })
    .click();
  await expect(page).toHaveURL(/\/spyglass\?run=spyglass_run%3A/);
  await expect(page.getByRole("heading", { name: query })).toBeVisible();
  await expect(
    page.getByText(/practical way to improve through deliberate practice/)
  ).toBeVisible();
});

test("shows a recoverable error when the stream closes before completion", async ({ page }) => {
  await logIn(page);

  await page.route(`${E2E_BACKEND_URL}/api/search/spyglass/stream`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: 'data: {"type":"status","data":"Starting analysis..."}\n\n',
    });
  });

  await page.goto("/spyglass");
  await page.getByPlaceholder("Ask your thoughts anything...").fill("Test an interrupted stream");
  await page.getByRole("button", { name: "Submit query" }).click();

  await expect(page.getByText("Could not complete this analysis")).toBeVisible();
  await expect(page.getByPlaceholder("Ask a follow-up question...")).toBeVisible();
});
