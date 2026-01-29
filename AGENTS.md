Hey agent!

# General Information
We use `bun`, not `pnpm`, `npm`, or `yarn` for dependency management and as a runtime. 

# GH Project
I have a github project w/ owner `noekohq` and it's number `1`. I have `gh` up and running. I will ask you to query the GitHub project for the purposes of planning and gathering requirements.

```sh
gh project item-list <PROJECT_NUMBER> --owner <OWNER> --format json \
  --jq '.items[] | select(.fieldValues[] | .field.name == "Status" and .name == "Todo")'
```

^^ You can use this format of command to filter specific items. For reference, these are some relevant fields:

### Status Definitions
* **📥 Inbox:** Idle ideas. Do not touch.
* **🎯 Backlog:** Ready for development. **Source of new work.**
* **⚡️ In Progress:** Currently active.
* **✨ Testing & QA:** Development complete, awaiting review.
* **✅ Done:** Complete.

### Priority & Complexity
* **Priority:** P0 - Critical, P1 - Strategic, P2 - Polish, P3 - Experiment
* **Complexity:** XS - Quick Hit, S - Small, M - Medium, L - Epic.

# Testing
Tests for the backend (Express API) are located in `./tests/*`. Tests for the frontend (React) are collocated inline with components (e.g., `Component.test.tsx`).

### Philosophy
**Confidence > Coverage.**
We do not aim for 100% coverage. We aim for high confidence in critical paths.
* **Backend:** Focus on **Integration Tests**. Hit the API endpoint, check the response, and verify the *real* database state. Avoid mocking the database.
* **Frontend:** Focus on **User Interaction**. Render the component and interact with it like a user (click, type). Mock the network requests, not the child components.
* **Unit Tests:** Reserve these *only* for complex, pure utility functions (e.g., math, data parsing).

### Stack & Tooling
* **Script:** `bun run server:test` for backend, `bun run client:test` for client-side, `bun run test` for both
* **Runner:** `server:test` -> `bun test`, `client:test` -> `vitest`
* **Backend:** `supertest` for API requests.
* **Frontend:** `react-testing-library` + `jsdom`.
* **Mocks:** `vi.mock()` (Vitest) for external services.

### Rules of Engagement (Strict)
1.  **Database Isolation:**
    * Tests must run against a **dedicated test database** (ending in `_test`), never development or production. This is pre-defined in `.env.test`
    * Do not assume data exists. Use `beforeEach` to wipe relevant tables.
    * Use Factories (helper functions) to create data required for the specific test inside the `it` block.
2.  **No "Test Mode" Logic:**
    * **Forbidden:** `if (process.env.NODE_ENV === 'test')` inside application code.
    * **Required:** Use Dependency Injection or Module Mocking (`vi.mock`) to change behavior during tests. Keep `src/` and `app/` clean.
3.  **External Services:**
    * **Mock Everything:** Never hit real APIs (OpenAI, Google, Stripe) during standard tests.
    * **Deterministic Vectors:** When testing vector search, mock the embedding service to return fixed arrays (e.g., `[1, 0...]`) to ensure tests are repeatable.

### Workflow
* **New Feature:** Write *one* integration test for the happy path.
* **Bug Fix:** Write a failing test that reproduces the bug before fixing it ("Regression Testing").
* **Refactor:** If refactoring legacy code, add a "Snapshot Test" first to pin current behavior.

# Completing tasks
After completing a task, run `bun run client:check` to ensure that types are working as expected. Run `bun test` to run our automated tests.


# Rules
These are things that you may NOT do as an agent without explicit permission.

- Do _not_ replace currently defined modules with new version, unless asked to. For example, don't replace "react-router" imports with "react-router-dom" imports
- Do _not_ update test files (`.test`, `.spec`) AT ALL without explicit permissions from the user.
