# Codebase Concerns

**Analysis Date:** 2026-02-08

## Tech Debt

**Old/Duplicate Files:**
- Issue: Outdated code files remain in the codebase alongside new implementations
- Files: `src/pages/Users/UsersOld.tsx`, `app/ai/embeddings/old.ts`
- Impact: Code clutter, confusion about which implementation is current, increased bundle size
- Fix approach: Remove old files after confirming new implementations are stable and tested

**Large Service Files:**
- Issue: Core service files exceed 2000 lines, indicating high complexity and multiple responsibilities
- Files: `app/services/Spyglass.ts` (2145 lines), `app/services/Search.ts` (2095 lines), `app/services/Graph.ts` (2087 lines)
- Impact: Difficult to maintain, test, and understand. High risk of side effects when modifying
- Fix approach: Split into smaller, focused modules. Extract query builders, result formatters, and different search strategies into separate files

**Large Model File:**
- Issue: Ideas model contains extensive business logic beyond data modeling
- Files: `app/database/models/ideas/index.ts` (1860 lines)
- Impact: Difficult to navigate, high coupling between concerns
- Fix approach: Extract query builders, computed fields, and helper functions into separate modules

**Deprecated Code Still Present:**
- Issue: Legacy hook marked deprecated but not removed
- Files: `src/pages/Spyglass/hooks/useSpyglass.ts` (marked `@deprecated` at line 83)
- Impact: Developers may use deprecated code unaware of better alternatives
- Fix approach: Create migration guide, update usages to `useSpyglassService`, then remove deprecated code

**TypeScript "any" Usage:**
- Issue: Widespread use of `any` type defeats TypeScript's type safety
- Files: 40+ instances across `app/services/`, `app/database/models/`, `src/utils/`, including:
  - `app/services/Recommendations.ts` (lines 288, 484, 641)
  - `app/services/Graph.ts` (lines 1211, 1212, 2062, 2080)
  - `app/ai/embeddings/old.ts` (lines 151, 208, 257)
  - `src/utils/ideas.ts` (line 24)
- Impact: Runtime errors, loss of autocomplete, harder to refactor
- Fix approach: Define proper interfaces for complex types. Use generics where appropriate. Enable `noImplicitAny` in tsconfig

**Package Manager Mismatch:**
- Issue: `package.json` declares `"packageManager": "yarn@4.5.3"` but project uses `bun`
- Files: `package.json` line 165
- Impact: Confusion for new developers, CI/CD issues if yarn is used
- Fix approach: Update package.json to remove yarn packageManager field or change to bun

**TODO Comments:**
- Issue: Unresolved TODO indicating search returning incorrect result types
- Files: `app/database/models/ideas/index.ts` line 1483: "this should only return ideas, nothing else"
- Impact: Search results may include non-idea records, breaking type assumptions
- Fix approach: Add type filtering to search query or create separate search function for ideas only

## Known Bugs

**Search Type Mismatch:**
- Symptoms: Search by embedding may return non-idea records (tasks, excerpts, etc.)
- Files: `app/database/models/ideas/index.ts` line 1483-1486
- Trigger: Using `Search.searchByEmbedding` from ideas context
- Workaround: Filter results by type on client side

## Security Considerations

**Real Secrets in .env.example:**
- Risk: Active API keys and credentials committed to repository
- Files: `.env.example` lines 92, 101, 105-106
  - `GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"` (line 92)
  - `MAILBABY_API_KEY="YOUR_MAILBABY_API_KEY_HERE"` (line 101)
  - `S3_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID_HERE"` (line 105)
  - `S3_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY_HERE"` (line 106)
- Current mitigation: None - these are live credentials
- Recommendations: **IMMEDIATE ACTION REQUIRED** - Rotate all exposed credentials, remove from .env.example, use placeholder values like `"your-api-key-here"`

**Weak Example Secrets:**
- Risk: Example token secret is trivial and may be used in development/production
- Files: `.env.example` lines 4, 63
  - `TOKEN_SECRET="generate-a-random-secret-here"`
- Current mitigation: None
- Recommendations: Generate cryptographically secure random string, add validation to reject weak secrets on startup

**No Security Middleware:**
- Risk: Missing standard security headers and XSS/CSRF protection
- Files: `app/index.ts` (no helmet, no csurf, no xss-clean imports)
- Current mitigation: Basic CORS configuration only
- Recommendations: Add `helmet` for security headers, `csurf` for CSRF protection on state-changing endpoints, `express-rate-limit` for API endpoints

**No API Rate Limiting:**
- Risk: API endpoints vulnerable to abuse, DDoS, credential stuffing
- Files: `app/api/*` (no rate limiting middleware detected)
- Current mitigation: Collaboration server has throttle (15 ops) in `app/collaboration/index.ts` line 87-88
- Recommendations: Add `express-rate-limit` to API routes. Consider different limits for auth (stricter) vs. read-only endpoints

**Limited Input Validation:**
- Risk: Malformed or malicious input may cause crashes or injection
- Files: `app/utils/validation.ts` (only 64 lines, 7 schemas)
- Current mitigation: Zod schemas for some endpoints (search, graph filters)
- Recommendations: Expand validation to all API endpoints. Add sanitization for user-generated content. Validate all RecordIds before database queries

**Database Password in Plain Environment:**
- Risk: Database credentials stored in plain text environment variables
- Files: `.env` (gitignored but referenced in `app/database/db.ts`)
- Current mitigation: `.env` is gitignored
- Recommendations: Use secret management service (AWS Secrets Manager, HashiCorp Vault) for production. Document secure deployment practices

## Performance Bottlenecks

**SELECT * Queries:**
- Problem: Database queries retrieve all columns including large embeddings
- Files: 20+ instances in `app/database/models/`:
  - `app/database/models/tag.ts` line 220
  - `app/database/models/search.ts` lines 108-111, 129-130
  - `app/database/models/ideas/index.ts` lines 139-142
  - `app/database/models/rabbithole.ts` line 198
- Cause: Using `SELECT *` without OMIT clauses for embedding columns
- Improvement path: Explicitly select needed columns, use `OMIT embeddings` consistently. Add performance tests to catch large payloads

**Embedding Arrays in Responses:**
- Problem: Vector embeddings (768-1024 dimensions) may be returned in API responses
- Files: Not consistently omitted in all queries across `app/database/models/`
- Cause: Inconsistent use of `OMIT embeddings` clause
- Improvement path: Audit all database queries, add `OMIT embeddings` by default. Create separate endpoints when embeddings are actually needed

**Large Graph Queries:**
- Problem: Graph traversal queries may return thousands of nodes/edges without pagination
- Files: `app/services/Graph.ts` methods like `getAllConnectables`
- Cause: Complex relationship queries without limits
- Improvement path: Implement cursor-based pagination for graph queries. Add query timeout protection. Consider caching frequently accessed graphs

**No Query Result Caching:**
- Problem: Expensive AI operations and database queries repeated on every request
- Files: `app/services/Search.ts`, `app/services/Spyglass.ts`
- Cause: No caching layer detected
- Improvement path: Add Redis for caching search results, embeddings, and computed insights. Cache with TTL based on data mutability

## Fragile Areas

**Database Connection Management:**
- Files: `app/database/db.ts`
- Why fragile: Complex reconnection logic, global singleton pattern, environment variable dependency
- Safe modification: Always use `getDatabase()` instead of accessing `Database.db` directly. Test connection loss scenarios. Never modify connection during request handling
- Test coverage: No connection resilience tests detected

**Authentication Token Handling:**
- Files: `app/utils/crypto.ts`, `app/middleware/auth.ts`, `app/database/models/user.ts` lines 624-674
- Why fragile: Token generation, verification, and refresh logic spread across multiple files
- Safe modification: Never change token signing algorithm or secret rotation without migration plan. Always verify tokens before trusting decoded data
- Test coverage: Basic auth tests in `tests/api/auth.test.ts` but no token rotation tests

**Embedding Provider Abstraction:**
- Files: `app/ai/embeddings/embeddings.ts`, `app/ai/embeddings/providers/google.ts`
- Why fragile: Provider switching logic relies on environment variables, no fallback
- Safe modification: Test with mock embedder (see `tests/api/search/search.test.ts` lines 6-18 for pattern). Never change embedding model without re-embedding all content
- Test coverage: Mocked in tests but no provider switching tests

**Search Scoring Algorithm:**
- Files: `app/services/Search.ts` lines 41-47 (weight constants)
- Why fragile: Changing weights affects all search results, no A/B testing capability
- Safe modification: Version scoring algorithms. Log score components for debugging. Test with known queries before deploying
- Test coverage: Basic search test in `tests/api/search/search.test.ts` but no scoring validation

## Scaling Limits

**Embedding Generation Rate:**
- Current capacity: Rate limited to env var `EMBEDDINGS_RPM_LIMIT` (default 60 RPM in old code, 1000 in .env.example)
- Limit: Google Gemini API quota (configurable per project)
- Scaling path: Implement request queuing with BullMQ (already dependency). Batch embed operations. Consider self-hosted embedding model for high volume

**Single Database Instance:**
- Current capacity: Single SurrealDB instance connection
- Limit: Connection pool exhaustion, single point of failure
- Scaling path: Implement connection pooling. Add read replicas for query distribution. Consider database sharding by user for multi-tenancy

**No Background Job Processing:**
- Current capacity: Long-running operations block request threads
- Limit: Request timeouts, poor UX for expensive operations
- Scaling path: BullMQ is a dependency but not utilized. Implement job queue for embeddings, analysis, exports

**File Upload Size:**
- Current capacity: Limited by `max_idea_size` setting in `app/settings.ts`
- Limit: Express body parser default (likely 10-50MB)
- Scaling path: Stream large files directly to S3. Process in background jobs. Implement chunked uploads for files >10MB

## Dependencies at Risk

**SurrealDB Maturity:**
- Risk: Database is relatively new (v1.x), breaking changes possible
- Impact: Schema migrations may be complex, query syntax changes
- Migration plan: Pin to minor version. Test upgrades in staging. Monitor SurrealDB release notes before updating

**Yarn/Bun Mismatch:**
- Risk: package.json declares yarn but bun is used, lockfile conflicts possible
- Impact: Dependency resolution differences, CI/CD failures
- Migration plan: Standardize on bun, remove yarn packageManager declaration, regenerate lockfile

**React 19:**
- Risk: React 19 is very recent (released 2024), ecosystem catching up
- Impact: Some libraries may have compatibility issues
- Migration plan: Monitor library compatibility. Test thoroughly before production deployment

## Missing Critical Features

**Error Monitoring:**
- Problem: No error tracking service integration (Sentry, etc.)
- Blocks: Production debugging, error trend analysis, alerting
- Priority: High - essential for production operations

**API Logging/Observability:**
- Problem: Only console.log statements (805 instances) for debugging
- Blocks: Request tracing, performance monitoring, audit trails
- Priority: High - needed for debugging production issues

**Database Backups:**
- Problem: No automated backup strategy detected (mentions `DB_BACKUP_BUCKET_NAME` in .env.example but unused)
- Blocks: Disaster recovery, data loss prevention
- Priority: Critical - data loss is catastrophic

**User Session Management:**
- Problem: Token refresh logic exists but no session invalidation or device management
- Blocks: User security features (logout all devices, session history)
- Priority: Medium - impacts user security control

## Test Coverage Gaps

**Large Services Untested:**
- What's not tested: Core business logic in Spyglass, Graph, Search services
- Files: `app/services/Spyglass.ts`, `app/services/Graph.ts`, `app/services/Search.ts`
- Risk: Refactoring these 2000+ line files without tests is extremely risky
- Priority: High

**Database Models Untested:**
- What's not tested: Model methods, query builders, relationship logic
- Files: All files in `app/database/models/` (15+ model files)
- Risk: Schema changes may break application logic silently
- Priority: High

**Frontend Components Untested:**
- What's not tested: Most React components lack tests
- Files: Only 2 component tests detected: `src/components/Utils/Spyglass/GlimpeModeDisplay.test.tsx`, `src/components/Search/Search.test.tsx`
- Risk: UI regressions undetected, especially in complex components like Graph (1092 lines), Spotlight (1082 lines)
- Priority: Medium

**Integration Test Gaps:**
- What's not tested: End-to-end workflows (create idea → search → tag → export)
- Files: Only basic API tests in `tests/api/` (auth, ideas, search)
- Risk: Feature interactions may break without detection
- Priority: Medium

**Error Handling Untested:**
- What's not tested: 470 error throw sites, 663 try-catch blocks lack coverage
- Files: Across all services and APIs
- Risk: Error cases may crash application or expose sensitive data
- Priority: High

---

*Concerns audit: 2026-02-08*
