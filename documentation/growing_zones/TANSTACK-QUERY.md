# TanStack Query Migration

We are replacing the legacy `useFetch` hook in `src/core/hooks` with TanStack Query. The goal is to
make server state predictable: reads should be cached and shared, mutations should invalidate the
data they affect, and components should not coordinate requests with one-off effects.

This is an incremental migration. Existing `useFetch` consumers may remain until their feature is
touched, but new server-state work should use TanStack Query.

## Current state

- `QueryClientProvider` is configured in `src/main.tsx`.
- `useApiQuery` unwraps the API's `DefaultResponse<T>` envelope for GET requests.
- Domain hooks exist for connectables, pins, rabbitholes, and tags.
- The file list is the first resumed migration slice and uses `useFiles` plus the shared file query
  keys in `src/domains/knowledge/hooks/useFile.ts`.
- Rabbitholes are the reference cache-coherence implementation: detail reads reconcile list caches,
  edits and generated context update both cache shapes, and create/delete operations add or remove
  list entries before navigation.
- Baseline before the resumed work (2026-08-04): 108 `useFetch` calls across 73 source files.

`src/core/hooks/useApiMutation.ts` is intentionally not part of the public migration API yet. The
mutation requirements below should be settled before introducing a generic wrapper.

## Conventions

### Keep request details in domain hooks

Components should consume hooks such as `useFiles()` or `useTag(...)`, rather than repeat URLs and
query keys. A small page-local query is acceptable while a domain has no reusable hook, but move it
when a second consumer appears.

### Use query-key factories

Each domain owns a key factory. Keys go from broad to specific so a mutation can invalidate either
an entire domain or one resource.

```ts
export const fileKeys = {
  all: ["files"] as const,
  lists: () => [...fileKeys.all, "list"] as const,
  detail: (fileId: string) => [...fileKeys.all, "detail", fileId] as const,
};
```

Every value that changes a response must appear in its query key, including IDs, filters, paging,
sort order, and organization or rabbithole scope.

### Let queries own reads

- Replace `useEffect(() => load(), [])` with an enabled query.
- Use `enabled` (or a `null` URL through `useApiQuery`) when required input is missing.
- Use `refetch` for an explicit refresh. Prefer invalidation after a mutation.
- Derive filtered or transformed values from query data instead of copying query data into local
  state. Infinite lists are the exception and should use `useInfiniteQuery`.

### Let mutations own writes

- Use `useMutation` for POST, PUT, PATCH, and DELETE operations.
- On success, invalidate the narrowest keys that can have changed.
- Keep form and modal state in the component; keep returned server state in the query cache.
- Preserve existing notifications and API error behavior during migration.
- Do not add `NODE_ENV === "test"` branches to application code.

### Preserve cancellation and authentication behavior

The shared Axios client remains responsible for authentication and global response handling.
Queries that can be superseded (search and typeahead) should pass TanStack Query's `AbortSignal` to
Axios. Authentication bootstrap is a later migration slice because it controls provider mounting
and token lifecycle, not ordinary cached server state.

## Cache coherence contract

Caching is a relationship between every read shape and every write that can affect it. A mutation is
not complete when the request succeeds; it is complete when all affected cache views are either
reconciled or explicitly invalidated.

For each domain, maintain an impact table while migrating its mutations:

| Mutation | Detail cache | List caches | Related caches |
| --- | --- | --- | --- |
| Create | Seed from the response | Insert immediately, then invalidate | Invalidate affected counts or suggestions |
| Update | Replace from the response | Replace the matching item, then invalidate | Invalidate derived data when relevant |
| Delete | Remove | Remove immediately, then invalidate | Remove or invalidate references |
| Add/remove relationship | Invalidate or patch | Invalidate if cards expose counts or summaries | Invalidate both sides of the relationship |

The write-through step prevents a stale frame when a user navigates from detail to list immediately
after saving. Invalidation remains necessary because the server may compute fields the client did
not receive or know how to derive. When an endpoint returns the complete updated resource, use that
response for both detail and list reconciliation. When it returns only a relationship or status,
invalidate and refetch the affected resource instead of guessing its final shape.

### Key hierarchy

Keys must distinguish roots, list families, individual list variants, detail families, and related
resources. This allows invalidating all filtered lists without invalidating unrelated detail data.

```ts
const keys = {
  all: ["resources"] as const,
  lists: () => [...keys.all, "list"] as const,
  list: (filters: Filters) => [...keys.lists(), filters] as const,
  details: () => [...keys.all, "detail"] as const,
  detail: (id: string) => [...keys.details(), id] as const,
};
```

Do not use a single key for both a list response and a key prefix. Centralize cache writes and
invalidation beside the domain key factory so mutations do not each invent a partial strategy.

### Mobile navigation behavior

"Mobile caching" here means fast route-to-route navigation under variable network conditions. The
expected behavior is:

1. Render useful cached data immediately.
2. Apply a successful mutation response to every affected cached view before navigating.
3. Mark those views stale and confirm them in the background.
4. Keep inactive queries eligible for refetch when they mount again.
5. Never depend on window-focus refetching to repair cache coherence.

Persisting the query cache across a browser restart is a separate future feature. It requires a
user-scoped persistence key, an explicit maximum age, selective dehydration of safe queries, and
clearing persisted data on logout or account changes. Do not enable global persistence merely to
solve stale navigation data.

### Duplicate server state

Context, component state, session storage, and the TanStack cache must not all become independent
owners of the same server object. During an incremental migration, any remaining duplicate (such as
the currently entered Rabbithole) must be explicitly refreshed after related mutations. The target
state is for contexts to store identity and UI state while domain queries own the resource data.

## Migration order

1. Straightforward read-only screens with mount-time GET requests.
2. Domain CRUD flows, adding key factories and mutation invalidation together.
3. Pagination, search, and typeahead using `useInfiniteQuery`, keyed parameters, and cancellation.
4. Context-backed server state, removing duplicated local caches as each context migrates.
5. Authentication and other lifecycle-sensitive requests.
6. Remove `useFetch` after the final consumer is migrated.

Avoid broad mechanical replacement. Each slice should preserve behavior and verify that all writes
refresh the queries they affect.

## Definition of done for a slice

- The migrated component no longer imports `useFetch`.
- Query keys include every input that affects the response.
- Mutations invalidate or update all affected cached data.
- The domain's mutation impact table covers create, update, delete, and relationship writes.
- Returning from detail to every list variant immediately shows the successful change.
- Loading, empty, error, cancellation, and notification behavior remains intentional.
- No request is triggered from an effect solely to populate server data.
- `bun run typecheck` and the relevant automated tests pass.
