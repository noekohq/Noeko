# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Full-Stack Monorepo with Client-Server Architecture

**Key Characteristics:**
- Backend: Express REST API with SurrealDB database
- Frontend: React SPA with Vite bundler
- Real-time: WebSocket-based collaborative editing (Hocuspocus/Yjs)
- Shared: TypeScript types and utilities shared between client and server
- Monorepo: Single repository containing both frontend and backend

## Layers

**Backend API Layer:**
- Purpose: REST endpoints and business logic
- Location: `app/api/`
- Contains: Express routers for resources (ideas, tasks, files, search, etc.)
- Depends on: Services, Database Models, Middleware
- Used by: Frontend via HTTP, Collaboration Server via imports

**Backend Services Layer:**
- Purpose: Complex business logic and stateful operations
- Location: `app/services/`
- Contains: Authorization, Graph, Search, Spyglass, Analysis, Recommendations
- Depends on: Database Models, AI utilities
- Used by: API routers, other services

**Database Layer:**
- Purpose: Data persistence and query abstraction
- Location: `app/database/`
- Contains: SurrealDB connection (`db.ts`), Models (`models/`), Seeders (`seeders/`)
- Depends on: SurrealDB client library
- Used by: Services, API endpoints

**AI Integration Layer:**
- Purpose: LLM and embedding operations
- Location: `app/ai/`
- Contains: LM adapters (`lms/`), Embedding providers (`embeddings/`)
- Depends on: Google Gemini, OpenAI SDKs
- Used by: Services (Search, Spyglass, Analysis)

**Collaboration Layer:**
- Purpose: Real-time collaborative editing
- Location: `app/collaboration/`
- Contains: Hocuspocus server configuration with database persistence
- Depends on: Database Models, Authorization Service
- Used by: Frontend via WebSocket upgrade from Express server

**Middleware Layer:**
- Purpose: Request preprocessing and authentication
- Location: `app/middleware/`
- Contains: Token verification (`auth.ts`)
- Depends on: User model, JWT utilities
- Used by: API routers

**Frontend Presentation Layer:**
- Purpose: UI components and pages
- Location: `src/components/`, `src/pages/`
- Contains: React components organized by feature/domain
- Depends on: Contexts, Hooks, Utils
- Used by: App routing

**Frontend State Management Layer:**
- Purpose: Global application state
- Location: `src/contexts/`
- Contains: React Context providers (Auth, Graph, Search, Layout, Settings, etc.)
- Depends on: API client, Local storage
- Used by: Components and Pages

**Frontend API Client Layer:**
- Purpose: HTTP communication with backend
- Location: `src/server/`
- Contains: Axios instance with interceptors (`api.ts`), Auth helpers (`auth.ts`)
- Depends on: Backend API
- Used by: Contexts, Hooks, Components

**Shared Types Layer:**
- Purpose: Type safety across client and server
- Location: `shared/types/`
- Contains: TypeScript interfaces for all domain entities
- Depends on: Nothing (pure types)
- Used by: All layers in both frontend and backend

## Data Flow

**Authenticated Request Flow:**

1. User interacts with React component
2. Component calls Context method or Hook
3. Context/Hook invokes API client (`src/server/api.ts`)
4. Axios sends HTTP request with JWT in cookie
5. Express middleware (`checkToken`) verifies JWT, attaches user to request
6. API router extracts params, calls Service or Model
7. Service performs business logic, queries Database
8. Database executes SurrealDB query, returns data
9. Response flows back through layers to frontend
10. React state updates, component re-renders

**Collaborative Editing Flow:**

1. User edits document in Tiptap editor
2. Yjs provider sends changes via WebSocket
3. Hocuspocus server receives update
4. Server calls `onAuthenticate` → Authorization service validates access
5. Database extension persists Yjs state and HTML to Model
6. Server broadcasts changes to other connected clients
7. Other clients receive updates, merge into local Yjs document

**Search Flow:**

1. User enters search query in UI
2. SearchContext calls `/api/search/` endpoint
3. Search service gets embeddings from AI layer
4. Service performs vector similarity search in SurrealDB
5. Results ranked and filtered by Authorization service
6. Frontend receives results, displays with highlights

**State Management:**
- Server: Stateless (JWT-based auth), persistent state in SurrealDB
- Client: React Context for global state, component state for local UI
- Collaboration: Operational Transform via Yjs CRDTs

## Key Abstractions

**Connectable:**
- Purpose: Generic abstraction for graph-connected entities (ideas, tasks)
- Examples: `app/services/Graph.ts`
- Pattern: Factory pattern - creates typed instances from record IDs

**Model Classes:**
- Purpose: Database entity abstraction with CRUD operations
- Examples: `app/database/models/user.ts`, `app/database/models/ideas/index.ts`
- Pattern: Active Record - models contain both data and persistence logic

**Service Classes:**
- Purpose: Encapsulate complex multi-step operations
- Examples: `app/services/Search.ts`, `app/services/Authorization.ts`, `app/services/Graph.ts`
- Pattern: Service Layer - stateful singleton instances managing domain logic

**React Contexts:**
- Purpose: Share state across component tree without prop drilling
- Examples: `src/contexts/AuthContext.tsx`, `src/contexts/GraphContext.tsx`
- Pattern: Provider pattern with custom hooks (`useAuth()`, `useGraph()`)

**LM Adapters:**
- Purpose: Unified interface for multiple LLM providers
- Examples: `app/ai/lms/`
- Pattern: Adapter pattern - normalize Google Gemini, OpenAI APIs

## Entry Points

**Backend Server:**
- Location: `app/index.ts`
- Triggers: `bun app/index.ts` or `bun run start`
- Responsibilities: Initialize database, mount API router, serve static files in production, handle WebSocket upgrades for collaboration

**Frontend Application:**
- Location: `src/main.tsx`
- Triggers: Browser loads `index.html`, Vite injects this as module
- Responsibilities: Render React app with context providers, set up routing, initialize mobile polyfills

**Database Initialization:**
- Location: `app/database/db.ts` → `initDatabase()`
- Triggers: Called from `app/index.ts` on server startup
- Responsibilities: Connect to SurrealDB, create namespace/database, run model migrations, seed initial data

**Test Suites:**
- Location: `tests/setup.server.ts` (backend), `tests/setup.client.ts` (frontend)
- Triggers: `bun test` (server), `vitest` (client)
- Responsibilities: Load test environment config, initialize test database

## Error Handling

**Strategy:** Layered error handling with different approaches per layer

**Patterns:**
- API Routes: Try-catch blocks returning JSON error responses with HTTP status codes
- Services: Throw errors, let API layer catch and format
- Database: Connection errors logged, operations may throw or return undefined
- Frontend API Client: Axios interceptors catch 401 (redirect to login), 403 (show unauthorized), 500 (show notification)
- React Components: Error boundaries catch render errors, display fallback UI
- Collaboration: WebSocket errors trigger authentication failures, disconnect clients

## Cross-Cutting Concerns

**Logging:** 
- Backend: `app/services/Logger.ts` service with structured logging to database (`Log` model)
- Frontend: Console logging, error tracking via notifications

**Validation:** 
- Backend: Zod schemas in `app/utils/validation.ts`, ad-hoc validation in routes
- Frontend: Mantine form validation, manual checks in components
- Shared: Type safety via TypeScript interfaces in `shared/types/`

**Authentication:** 
- Backend: JWT-based with access tokens (cookies) and refresh tokens
- Middleware: `checkToken`, `checkIsSuperuser`, `disallowDisabled` in `app/middleware/auth.ts`
- Frontend: AuthContext manages login state, API client auto-refreshes tokens via interceptors
- Collaboration: Cookie-based JWT verification in `onAuthenticate` hook

---

*Architecture analysis: 2026-02-08*
