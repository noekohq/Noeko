# Testing Patterns

**Analysis Date:** 2026-02-08

## Test Framework

**Runner:**
- Backend: `bun test` (built-in Bun test runner)
- Frontend: `vitest` 4.0.17
- Backend config: No separate config file; uses `--test-sequential` flag
- Frontend config: No `vitest.config.ts` detected (may use inline Vite config)

**Assertion Library:**
- Vitest assertions (expect API)
- `@testing-library/jest-dom` for DOM assertions (frontend)

**Run Commands:**
```bash
bun test                 # Run all tests (backend + frontend)
bun run server:test      # Run backend tests only
bun run client:test      # Run frontend tests only
bun run client:check     # Type-check frontend
```

**Additional flags:**
- Backend: `--test-sequential` ensures tests run in order (important for shared database state)
- Backend: `--preload ./tests/setup.server.ts` runs global setup before tests

## Test File Organization

**Location:**
- Backend: Separate `tests/` directory at project root
  - API tests: `tests/api/*/` (e.g., `tests/api/auth.test.ts`, `tests/api/ideas/ideas.test.ts`)
  - Helpers: `tests/helpers/` (e.g., `tests/helpers/factories.ts`, `tests/helpers/context.ts`)
  - Setup: `tests/setup.server.ts` (global initialization)
- Frontend: Co-located with components (e.g., `src/components/Search/Search.test.tsx`)

**Naming:**
- `*.test.ts` for backend tests
- `*.test.tsx` for frontend component tests
- Pattern: `<module>.test.<ext>`

**Structure:**
```
tests/
├── setup.server.ts           # Global setup
├── helpers/
│   ├── factories.ts          # Test data factories
│   └── context.ts            # Auth context helpers
└── api/
    ├── auth.test.ts
    ├── ideas/
    │   └── ideas.test.ts
    └── search/
        └── search.test.ts

src/components/
└── Search/
    ├── Search.tsx
    └── Search.test.tsx
```

## Test Structure

**Suite Organization:**
```typescript
// Backend pattern (tests/api/ideas/ideas.test.ts)
describe("Ideas Router", () => {
  let createdIdeaId: string;

  describe("GET /api/ideas", () => {
    it("Retrieves existing onboarding ideas", async () => {
      const response = await authRequest().get("/api/ideas");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("POST /api/ideas", () => {
    it("Creates a new idea", async () => {
      const response = await authRequest().post("/api/ideas").send(ideaData);
      expect(response.status).toBe(200);
      createdIdeaId = response.body.data.id;
    });
  });
});
```

```typescript
// Frontend pattern (src/components/Search/Search.test.tsx)
describe("Search Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MantineProvider>
        <MemoryRouter>
          <Search />
        </MemoryRouter>
      </MantineProvider>,
    );
  };

  it("renders search input field", () => {
    (useSearchQuery as any).mockReturnValue(defaultHookState);
    renderComponent();
    const searchInput = screen.getByRole("textbox");
    expect(searchInput).toBeInTheDocument();
  });
});
```

**Patterns:**
- Nested `describe` blocks for API routes/component features
- Suite-level variables for sharing data between tests (backend)
- Helper render functions for consistent component setup (frontend)
- `beforeEach` for clearing mocks (frontend)

## Mocking

**Framework:** 
- Backend: `bun:test` `mock.module()` and `vitest` `vi.mock()`
- Frontend: `vitest` `vi.mock()`

**Patterns:**

**Backend - Global mocks in `tests/setup.server.ts`:**
```typescript
// Crypto functions (always mocked for determinism)
vi.mock("../app/utils/crypto", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed_${password}`),
  verifyPassword: vi.fn(async (password, hashed) => password === hashed),
  generateToken: vi.fn((payload) => `token_${JSON.stringify(payload)}`),
}));

// External services (never hit real APIs)
mock.module("../app/utils/mailbaby", () => ({
  mailbaby: { post: () => Promise.resolve({ data: {} }) },
  MailBabyService: class { ... },
}));

mock.module("../app/utils/aws/s3", () => ({
  writeToS3: () => Promise.resolve({ written: 0, completed: true }),
  deleteFromS3: () => Promise.resolve(true),
}));
```

**Backend - Per-test mocks:**
```typescript
// Deterministic embeddings (tests/api/search/search.test.ts)
vi.mock("../../../app/ai/embeddings/embeddings", () => ({
  getEmbedder: vi.fn(() => ({
    model: "mock-model",
    embedContent: vi.fn(async () => new Array(768).fill(0)),
    embedContents: vi.fn(async (contents) => contents.map(() => new Array(768).fill(0))),
  })),
}));
```

**Frontend - Hook and context mocks:**
```typescript
// Mock custom hook
vi.mock("../../hooks/useSearchQuery", () => ({
  default: vi.fn(),
}));

// Mock context provider
vi.mock("../../contexts/SearchContext", () => ({
  useSearch: vi.fn(() => ({
    global: {
      results: { set: vi.fn() },
      topResult: { set: vi.fn() },
    },
  })),
}));

// Mock child components (test in isolation)
vi.mock("./SearchBar", () => ({
  SearchBar: ({ query, setQuery }: any) => (
    <input value={query} onChange={(e) => setQuery(e.target.value)} />
  ),
}));
```

**What to Mock:**
- External APIs (OpenAI, Google, AWS, email services)
- Crypto operations (for determinism)
- Vector embeddings (return fixed arrays)
- Child components (frontend - test components in isolation)
- Custom hooks (frontend - control return values)

**What NOT to Mock:**
- Database (backend tests hit real test database)
- React Testing Library internals
- Standard library functions

## Fixtures and Factories

**Test Data:**
```typescript
// Factory pattern (tests/helpers/factories.ts)
export const createUser = async (overrides: any = {}) => {
  const db = await getDatabase();
  const email = overrides.email || `test-${Bun.randomUUIDv7()}@example.com`;
  
  const userData = {
    firstName: "Test",
    lastName: "User",
    email,
    password: "password123",
    scratchpadContent: "",
    acceptedTermsOfServiceAt: new Date(),
    acceptedPrivacyPolicyAt: new Date(),
    settings: { isNew: true },
    roles: [new StringRecordId("role:user")],
    createdAt: new Date(),
    updatedAt: new Date(),
    disabled: false,
    ...overrides,
  };

  const result = await db?.create("user", userData);
  return Array.isArray(result) ? result[0] : result;
};

export const seedUserOnboarding = async (userId: string) => {
  const guide = new TourGuide({ userId });
  await guide.loadOnboarding();
};
```

**Default mock states (frontend):**
```typescript
const defaultHookState: IUseSearchQueryReturn = {
  searchQuery: "",
  setQuery: vi.fn(),
  loading: false,
  scope: {},
  setScope: vi.fn(),
  glimpseMode: false,
  setGlimpseMode: vi.fn(),
  // ... all hook return values
};
```

**Location:**
- Backend factories: `tests/helpers/factories.ts`
- Frontend mock states: Inline in test files
- Global test user: `tests/helpers/context.ts` (MOCK_USER_ID, MOCK_USER_EMAIL)

## Coverage

**Requirements:** No explicit coverage target enforced

**View Coverage:**
```bash
# Not configured in package.json
# Would require adding --coverage flag to vitest
```

**Philosophy:**
- Focus on confidence in critical paths over coverage percentage
- Backend: Integration tests hit API endpoints + real database
- Frontend: User interaction tests with mocked network calls

## Test Types

**Unit Tests:**
- Not heavily used
- Reserved for pure utility functions
- Example: Math helpers, data parsers (if needed)

**Integration Tests (Backend - Primary Focus):**
- Test entire API request → database → response flow
- Use real test database (ending in `_test` from `.env.test`)
- Hit actual endpoints with `supertest`
- Verify database state after operations
- Example from `tests/api/search/search.test.ts`:
```typescript
it("Returns results from seeded onboarding data", async () => {
  const response = await authRequest().post("/api/search").send({
    query: "Mission",
  });

  expect(response.status).toBe(200);
  expect(response.body.data.length).toBeGreaterThan(0);
  
  const titles = response.body.data.map((r: any) => r.value.title);
  expect(titles).toContain("Noeko's Mission");
});
```

**Component Tests (Frontend - Primary Focus):**
- Render component and interact like a user
- Use `@testing-library/react` for rendering and queries
- Mock network requests (hooks, contexts)
- Don't mock child components excessively (only when needed)
- Example from `src/components/Search/Search.test.tsx`:
```typescript
it("updates search query when user types", () => {
  const setQuery = vi.fn();
  (useSearchQuery as any).mockReturnValue({
    ...defaultHookState,
    setQuery,
  });

  renderComponent();

  const searchInput = screen.getByRole("textbox");
  fireEvent.change(searchInput, { target: { value: "test query" } });

  expect(setQuery).toHaveBeenCalledWith("test query");
});
```

**E2E Tests:**
- Not detected in codebase
- No Playwright/Cypress configuration found

## Common Patterns

**Async Testing:**
```typescript
// Backend - async/await with authRequest helper
it("Accepts authenticated requests", async () => {
  const response = await authRequest().post("/api/search").send({
    query: "test",
  });

  expect(response.status).toBe(200);
  expect(response.body.message).toBe("Succesfully searched");
});
```

**Error Testing:**
```typescript
// Backend - test error responses
it("Rejects unauthenticated requests", async () => {
  const response = await request(app).post("/api/search").send({
    query: "test",
  });

  expect(response.status).toBe(401);
});

it("Rejects invalid search query (missing query field)", async () => {
  const response = await authRequest().post("/api/search").send({});
  expect(response.status).toBe(400);
});
```

**Frontend - Testing user interactions:**
```typescript
it("toggles glimpse mode when button is clicked", () => {
  const setGlimpseMode = vi.fn();
  (useSearchQuery as any).mockReturnValue({
    ...defaultHookState,
    glimpseMode: false,
    setGlimpseMode,
  });

  renderComponent();

  const glimpseButton = screen.getByText("Smart");
  fireEvent.click(glimpseButton);

  expect(setGlimpseMode).toHaveBeenCalledWith(true);
});
```

## Database Testing Strategy

**Isolation:**
- Dedicated test database (name ends in `_test`)
- Configured in `.env.test`
- NEVER runs against development or production database

**Setup:**
- Global initialization in `tests/setup.server.ts`
- Wipes database ONCE at start of test run
- Seeds a global mock user + onboarding data
- Subsequent tests reuse this seeded data for speed

**Data Management:**
- No `beforeEach` wipes (tests run sequentially and may depend on prior test data)
- Tests can create additional data as needed using factories
- Persistence between tests is intentional (see comment in `tests/api/search/search.test.ts`)

**Critical Rule:**
- Do NOT add `if (process.env.NODE_ENV === 'test')` in application code
- Use mocking and dependency injection instead

## Authentication in Tests

**Backend:**
```typescript
// Helper creates authenticated requests (tests/helpers/context.ts)
export const authRequest = () => {
  const r = request(app);
  const bearerToken = `Bearer ${_token}`;

  return {
    get: (url: string) => r.get(url).set("Authorization", bearerToken),
    post: (url: string) => r.post(url).set("Authorization", bearerToken),
    put: (url: string) => r.put(url).set("Authorization", bearerToken),
    delete: (url: string) => r.delete(url).set("Authorization", bearerToken),
  };
};

// Usage
const response = await authRequest().post("/api/ideas").send(ideaData);
```

**Frontend:**
- Mock auth context/hooks as needed
- No authentication required for component rendering tests

---

*Testing analysis: 2026-02-08*
