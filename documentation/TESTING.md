# Testing Strategy & Philosophy

This document outlines the testing patterns, tooling, and philosophy for the Twig project.

## Core Philosophy
**Confidence > Coverage.**
We do not aim for 100% coverage. We aim for high confidence in critical paths.

### Backend (Integration Tests)
- **Location:** `./tests/*`
- **Tooling:** `bun test` (runner) + `supertest` (API requests).
- **Strategy:** Hit the real API endpoints, verify responses, and check the *real* database state.
- **Database:** Tests run against a dedicated test database (ending in `_test`), defined in `.env.test`.
- **Session Persistence:** By default, the database is wiped and seeded with a standard user (`user:test`) and onboarding data **once per test run**. This allows tests to share state and mimic real user sessions.

### Frontend (User Interaction)
- **Location:** Collocated with components (e.g., `Component.test.tsx`).
- **Tooling:** `vitest` + `react-testing-library` + `jsdom`.
- **Strategy:** Render components and interact with them like a user (click, type). Mock network requests, not child components.

## Test Data & Global Context
We use a global context to provide a consistent, authenticated experience across the test suite.

- **`tests/helpers/context.ts`**: Stores the global authentication token and provides the `authRequest()` helper.
- **`authRequest()`**: Returns a wrapper around `supertest` with the `Authorization` header already set. Supports `.get()`, `.post()`, `.put()`, `.delete()`, and `.patch()`.

### Example: Authenticated Request
```typescript
import { authRequest } from "../../helpers/context";

it("creates an idea", async () => {
  const response = await authRequest()
    .post("/api/ideas")
    .send({ title: "My Idea", content: "..." });
    
  expect(response.status).toBe(200);
});
```

## Setup Apparatus
- **`tests/setup.server.ts`**: The central orchestrator for backend tests. It handles:
  1. **Global Initialization**: Wipes the DB and seeds the mock user and onboarding data if they don't exist in the database yet.
  2. **Service Mocks**: Standardizes mocks for AI, Mail, and S3.
  3. **Context Setup**: Generates the token used by `authRequest()`.

## Running Tests
- **All tests:** `bun run test`
- **Backend only:** `bun run server:test` (runs sequentially via `--test-sequential` to allow state persistence between files).
- **Frontend only:** `bun run client:test`

## Rules of Engagement
1. **No "Test Mode" Logic:** Avoid `if (process.env.NODE_ENV === 'test')` inside application code.
2. **Session Persistence:** Tests can depend on data created in previous files/blocks within the same run. **Note:** Because files run sequentially, an idea created in `ideas.test.ts` will be available in `search.test.ts` if it runs later.
3. **Deterministic Results:** AI and search tests use mocked embeddings returning fixed vectors to ensure consistency.
4. **Database Integrity:** Always verify the final state of the database in integration tests.
