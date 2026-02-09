# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `Search.tsx`, `DreamWriter.tsx`)
- Utilities: camelCase (e.g., `useFetch.ts`, `formatting.ts`)
- Styles: Component name + `.module.scss` (e.g., `Search.module.scss`)
- Tests: Component/module name + `.test.ts` or `.test.tsx` (e.g., `Search.test.tsx`, `auth.test.ts`)
- Type declarations: `.d.ts` suffix (e.g., `things.d.ts`, `graph.d.ts`)

**Functions:**
- camelCase for standard functions (e.g., `createUser`, `getAuthToken`, `refreshHeaders`)
- Arrow functions preferred for React components and middleware
- Async functions: Use `async` keyword consistently (e.g., `async () => {}`)

**Variables:**
- camelCase for standard variables (e.g., `searchQuery`, `createdIdeaId`)
- SCREAMING_SNAKE_CASE for constants from environment (e.g., `MAX_IDEA_SIZE`, `NODE_ENV`)
- Descriptive names preferred over abbreviations

**Types:**
- Interfaces: Prefix with `I` (e.g., `IUser`, `ISafeUser`, `IThemeSpec`)
- Types: Prefix with `I` (e.g., `INode`, `IGraph`, `IProcessedText`)
- Location: Shared types in `shared/types/`, frontend types in `src/declarations/` or `src/types/`

## Code Style

**Formatting:**
- No explicit formatter config detected (no Prettier/Biome config found)
- 2-space indentation (observed in files)
- Double quotes for strings
- Semicolons required at end of statements
- Trailing commas in multi-line objects and arrays

**Linting:**
- TypeScript strict mode enabled in `tsconfig.json`
- `noFallthroughCasesInSwitch: true`
- `noUnusedLocals` and `noUnusedParameters` commented out (not enforced)
- No ESLint config detected

## Import Organization

**Order:**
1. External packages (React, third-party libraries)
2. Internal utilities and services
3. Type imports
4. Relative imports (components, styles)
5. Styles (`.module.scss` files typically last)

**Example from `src/components/Search/Search.test.tsx`:**
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { MantineProvider } from "@mantine/core";
import Search from "./Search";
import useSearchQuery from "../../hooks/useSearchQuery";
```

**Path Aliases:**
- Relative imports used throughout (e.g., `../../hooks/useFetch`)
- Absolute imports for shared types (e.g., `../../../shared/types/user`)
- No path aliases configured in TypeScript

## Error Handling

**Patterns:**
- Try-catch blocks in async middleware and API routes
- Error responses: `res.status(XXX).json({ message: "...", error: ... })`
- Console logging for errors: `console.error("Error description:", err)`
- Middleware returns early on error with appropriate status code
- Frontend: Error callbacks in hooks (e.g., `onError` in `useFetch`)

**Example from `app/middleware/auth.ts`:**
```typescript
try {
  const token = await getAccessTokenFromReq(req);
  if (!token) {
    res.status(401).json({ message: "Unauthenticated." });
    return;
  }
  const decoded = await verifyToken<ISafeUser>(token);
  // ...
  next();
} catch (err) {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
}
```

## Logging

**Framework:** Built-in `console` methods

**Patterns:**
- `console.info()` for startup messages and successful operations
- `console.error()` for errors and failures (heavily used in `app/database/models/`)
- `console.warn()` for warnings and deprecations
- Descriptive log messages with context (e.g., file paths, IDs, operation names)

**Common usage:**
```typescript
console.info("Initializing global test session (Wipe & Seed)...");
console.error("Error creating idea: ", err);
console.warn("Logout handler not configured. Attempting basic cleanup.");
```

## Comments

**When to Comment:**
- Document complex logic or non-obvious behavior
- Explain "why" rather than "what"
- Mark intentional design decisions
- Warn about edge cases or gotchas

**JSDoc/TSDoc:**
- Used for public API functions and test helpers
- Describes parameters and return values
- Example from `tests/helpers/factories.ts`:
```typescript
/**
 * Creates a test user.
 * If overrides.id is provided, it uses that specific RecordId.
 */
export const createUser = async (overrides: any = {}) => { ... }
```

- Inline comments for clarifying intent:
```typescript
// Empty body, refresh token is in the cookie
// Redundant if withCredentials is global, but explicit for clarity
```

## Function Design

**Size:** 
- Varied; complex database models have large methods (500+ lines in `app/database/models/ideas/index.ts`)
- Test functions are concise (10-30 lines per `it` block)
- Utility functions tend to be smaller and focused

**Parameters:**
- Options objects preferred for many parameters
- Type generics used extensively (e.g., `useFetch<B, D>`)
- Optional parameters with defaults (e.g., `method = "GET"`)

**Return Values:**
- Explicit return types in TypeScript
- Promises for async operations
- Structured response objects (e.g., `{ success, data, message }`)
- React hooks return objects with named properties (e.g., `{ loading, data, load, success }`)

## Module Design

**Exports:**
- Named exports for utilities and components
- Default exports for React components and class-based models
- Re-exports for backward compatibility (e.g., `export type { IUser, ISafeUser }` in `app/database/models/user.ts`)

**Example from `app/middleware/auth.ts`:**
```typescript
export const checkToken = async (...) => { ... };
export const checkIsSuperuser = async (...) => { ... };
export const disallowDisabled = async (...) => { ... };
```

**Barrel Files:**
- Used in some places (e.g., `app/database/models/index.ts`)
- Not consistently applied across codebase

## React Conventions

**Component Structure:**
- Functional components with hooks
- Props destructuring in function signature
- Custom hooks follow `use*` pattern (e.g., `useFetch`, `useSearchQuery`)

**State Management:**
- `useState` for local state
- Custom context providers for global state (e.g., `AuthContext`, `SearchContext`)
- Effect hooks with dependency arrays

**Styling:**
- CSS Modules (`.module.scss`)
- Mantine UI component library for base components
- Sass for styling

---

*Convention analysis: 2026-02-08*
