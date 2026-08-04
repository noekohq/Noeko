# Testing Noeko

Noeko favors confidence in important behavior over raw coverage. Choose the
smallest test boundary that exercises the behavior as users experience it, and
use end-to-end tests only when crossing the real browser, server, database, or
collaboration boundaries is essential to the assertion.

## Test layers

| Layer                | Location                                | Runner                         | Use it for                                                                         |
| -------------------- | --------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| Backend integration  | `tests/`                                | Bun test + Supertest           | API behavior and persisted SurrealDB state                                         |
| Frontend interaction | Collocated `*.test.tsx` files in `src/` | Vitest + React Testing Library | User interactions and client state with mocked network boundaries                  |
| Browser end-to-end   | `e2e/specs/`                            | Playwright                     | A few critical flows across the real client, API, database, and WebSocket services |
| Live AI diagnostics  | `integration/spyglass/`                 | Bun test                       | Opt-in checks against real OpenAI embeddings and language models                   |

Pure unit tests are appropriate for complex deterministic utilities. Most
backend behavior should be tested through its API, and most frontend behavior
should be tested through visible controls rather than component internals.

## Common commands

```sh
# Backend and frontend suites
bun run test

# One standard suite
bun run test:server
bun run test:client

# Type safety
bun run typecheck

# Browser end-to-end suite
bun run test:e2e
bun run test:e2e:headed
bun run test:e2e:ui

# Stop the isolated E2E database
bun run e2e:db:down
```

`bun run test` does not include Playwright or live-provider diagnostics. Run
the relevant E2E flow when a change affects a critical cross-service path.

Backend tests require a running SurrealDB instance at the connection configured
in `.env.test`. Start the local database before running `test:server`; a
connection refusal means the test dependency is unavailable, not that the
frontend suite failed.

## Standard development flow

For a new feature:

1. Add one happy-path test at the lowest boundary that still proves the
   behavior.
2. Add edge cases only where they materially increase confidence.
3. Run the affected suite while iterating.
4. Before handing off, run `bun run typecheck` and `bun run test`.
5. Run `bun run test:e2e` when the change affects a covered browser flow or a
   service boundary used by one.

For a bug fix, first add a regression test that fails for the reported
behavior, then implement the fix and verify that test. For a risky legacy
refactor, pin the current externally observable behavior before restructuring
the implementation.

## Backend integration tests

Backend tests live under `tests/` and exercise the Express application with
Supertest. They use the real test database configured by `.env.test`; external
services such as AI, email, and object storage are mocked in
`tests/setup.server.ts`.

Use `authRequest()` from `tests/helpers/context.ts` for authenticated requests:

```ts
import { expect, test } from "bun:test";
import { authRequest } from "../../helpers/context";

test("creates an idea", async () => {
  const response = await authRequest().post("/api/ideas").send({
    title: "A test idea",
    content: "Created through the real API.",
    visibility: "private",
  });

  expect(response.status).toBe(200);
  // Also query the database when persisted state is part of the contract.
});
```

The setup process seeds a standard authenticated user and onboarding data.
Tests must still create the records needed for their own assertions and clean
the tables they mutate. Do not depend on data or ordering from another test
file.

When testing semantic or hybrid retrieval in the standard suite, replace the
embedding boundary with deterministic vectors. This makes relevance assertions
repeatable while still exercising the real search and database implementation.

## Frontend interaction tests

Frontend tests are collocated with the component or feature they cover and run
in jsdom. Render the component in its normal providers, interact through
accessible roles and labels, and assert what the user can observe.

- Mock HTTP or other external boundaries, not child components.
- Prefer `getByRole`, `getByLabelText`, and visible copy over class selectors.
- Avoid assertions against private state or implementation details.
- Include loading, failure, and retry behavior when those states are meaningful
  to the user.

Run a focused Vitest file during development:

```sh
bun --env-file=.env.test vitest run path/to/Component.test.tsx
```

## End-to-end tests

The Playwright suite starts:

- the React client at `http://localhost:5174`;
- the Express API at `http://localhost:3027`;
- an isolated SurrealDB container on port `8002`; and
- the collaboration WebSocket as part of the application server.

Configuration lives in:

- `.env.e2e` for isolated service and provider settings;
- `docker-compose.e2e.yml` for the ephemeral SurrealDB service;
- `playwright.config.ts` for browsers, servers, retries, and artifacts;
- `e2e/support/fixtures.ts` for database reset and login helpers; and
- `scripts/e2e/reset.ts` for the guarded data reset and E2E user seed.

The reset script refuses to operate unless `DB_DATABASE` ends in `_test`.
Every Playwright test receives the automatic reset fixture. Each spec must also
use unique data and avoid depending on another spec so the suite remains safe
to run in any order. Standard E2E tests use deterministic AI providers and
must never call a billable external service.

### Covered core flows

The current suite covers:

- protected-route redirection and login;
- idea creation, title updates, collaboration persistence, and reload;
- deterministic Spyglass Glimpse generation and history;
- durable Deep Focus streaming, citations, saved history, and replay;
- reconnecting to a Deep Focus run after leaving the page; and
- recoverable handling of an interrupted legacy stream.

### Writing an E2E test

Import the project fixture instead of Playwright's base fixture:

```ts
import { expect, logIn, test } from "../support/fixtures";

test("completes a critical flow", async ({ page }) => {
  await logIn(page);
  await page.goto("/somewhere");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Done" })).toBeVisible();
});
```

Keep E2E tests focused on high-value journeys:

- Interact through the UI for the behavior under test.
- Use `page.request` to arrange prerequisite data when creating that data in
  the UI is not part of the journey.
- Wait on visible outcomes, responses, or `expect.poll`; do not use fixed
  sleeps.
- Use unique test data and do not depend on another spec.
- Assert persistence through a reload or API/database read when persistence is
  the behavior being proved.

To run one file or match one title:

```sh
bun run e2e:db:up
bun --env-file=.env.e2e playwright test e2e/specs/spyglass.spec.ts
bun --env-file=.env.e2e playwright test --grep "replays it from history"
```

Playwright writes failure output to `test-results/e2e/`. CI also produces an
HTML report in `playwright-report/`; traces, screenshots, and videos follow the
retention policy in `playwright.config.ts`.

If a local API or client is already running on the E2E ports, Playwright reuses
it outside CI. Restart those processes when environment changes appear not to
take effect.

## Live Spyglass and semantic-search diagnostics

`bun run test:spyglass:live` is an explicit, local-only diagnostic suite. It
loads `OPENAI_API_KEY` from `.env`, forces both language-model and embedding
providers to OpenAI, and uses the isolated E2E database.

The harness:

1. creates a temporary user and controlled note corpus with distractors;
2. verifies semantic retrieval using real embeddings;
3. observes each Glimpse and Deep Focus generation phase;
4. checks structured output, evidence grounding, citations, saved records, and
   history replay; and
5. removes its temporary records.

Results and phase traces are written to `test-results/spyglass-live/`. This
suite is intentionally excluded from `bun run test`, `bun run test:e2e`, and
CI because it is billable, slower, and nondeterministic. It is a provider
viability check, not a substitute for deterministic regression coverage.

Optional overrides:

- `SPYGLASS_LIVE_EMBEDDINGS_MODEL`
- `SPYGLASS_LIVE_EMBEDDINGS_DIMENSION`

## Isolation and mocking rules

1. Test databases must have names ending in `_test`. Never point a test command
   at development or production data.
2. A test creates all domain data required for its assertions and cleans the
   state it mutates.
3. Application code must not branch on `NODE_ENV === "test"`. Inject or mock
   external boundaries from the test harness.
4. Standard tests never call OpenAI, Google, email, storage, payment, or other
   external services.
5. Search regression tests use deterministic vectors and deterministic model
   output. Real-provider checks stay in the opt-in live suite.

## CI

The Playwright workflow is defined in `.github/workflows/e2e.yml`. It installs
Bun and Chromium, runs `bun run test:e2e`, uploads Playwright artifacts, and
always stops the E2E services. Keep CI E2E deterministic and free of secrets;
real-provider diagnostics remain local and opt-in.
