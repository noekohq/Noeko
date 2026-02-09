# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
noeko/
├── app/                      # Backend (Express API)
│   ├── api/                  # REST endpoints
│   ├── services/             # Business logic services
│   ├── database/             # DB models and connection
│   ├── ai/                   # LLM and embedding integrations
│   ├── collaboration/        # Real-time editing server
│   ├── middleware/           # Request middleware
│   ├── utils/                # Backend utilities
│   ├── lib/                  # Shared backend libraries
│   ├── templates/            # Email and onboarding templates
│   └── index.ts              # Server entry point
├── src/                      # Frontend (React)
│   ├── components/           # React components
│   ├── pages/                # Page-level components
│   ├── contexts/             # React Context providers
│   ├── hooks/                # Custom React hooks
│   ├── server/               # API client
│   ├── utils/                # Frontend utilities
│   ├── styles/               # Global styles
│   ├── types/                # Frontend-specific types
│   ├── vars/                 # Constants and config
│   ├── main.tsx              # Frontend entry point
│   └── App.tsx               # Root component with routing
├── shared/                   # Shared between client/server
│   ├── types/                # TypeScript type definitions
│   ├── vars/                 # Shared constants
│   └── editing/              # Tiptap editor config
├── tests/                    # Test suites
│   ├── api/                  # Backend API tests
│   ├── helpers/              # Test utilities
│   ├── setup.server.ts       # Server test config
│   └── setup.client.ts       # Client test config
├── public/                   # Static assets
├── dist/                     # Production build output
├── scripts/                  # Build and utility scripts
├── .planning/                # Planning and documentation
│   └── codebase/             # Codebase documentation
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite bundler config
└── vitest.config.js          # Vitest test config
```

## Directory Purposes

**app/**
- Purpose: Backend server implementation
- Contains: Express API, services, database models, AI integrations
- Key files: `index.ts` (server entry), `settings.ts` (configuration)

**app/api/**
- Purpose: REST API endpoint definitions
- Contains: Express routers organized by resource (ideas, tasks, files, search, users, etc.)
- Key files: `index.ts` (router aggregator), `ideas/index.ts`, `search/index.ts`, `users.ts`

**app/services/**
- Purpose: Business logic and stateful operations
- Contains: Service classes for complex features
- Key files: `Graph.ts`, `Search.ts`, `Spyglass.ts`, `Authorization.ts`, `Recommendations.ts`

**app/database/**
- Purpose: Database connection and data models
- Contains: SurrealDB client, model definitions, seeders
- Key files: `db.ts` (connection), `models/index.ts`, `models/user.ts`, `models/ideas/index.ts`

**app/ai/**
- Purpose: AI/ML integrations
- Contains: LLM adapters and embedding providers
- Key files: `lms/lm.ts`, `embeddings/embeddings.ts`

**app/collaboration/**
- Purpose: Real-time collaborative editing
- Contains: Hocuspocus server configuration
- Key files: `index.ts` (WebSocket server setup)

**app/middleware/**
- Purpose: Express middleware functions
- Contains: Authentication and request processing
- Key files: `auth.ts` (JWT verification, role checking)

**app/utils/**
- Purpose: Backend utility functions
- Contains: Validation, data processing, crypto, email
- Key files: `validation.ts`, `crypto.ts`, `requests.ts`, `email.ts`

**src/**
- Purpose: Frontend React application
- Contains: Components, pages, contexts, hooks
- Key files: `main.tsx` (entry), `App.tsx` (routing)

**src/components/**
- Purpose: Reusable React components
- Contains: Organized by feature domain
- Subdirectories: `UI/`, `Display/`, `Graph/`, `Search/`, `Forms/`, `Layout/`, `Utils/`, `Collaboration/`

**src/pages/**
- Purpose: Top-level route components
- Contains: One directory per major route
- Key files: `Dashboard/Dashboard.tsx`, `Idea/Idea.tsx`, `Spyglass/Spyglass.tsx`, `Auth/Login.tsx`

**src/contexts/**
- Purpose: Global state management via React Context
- Contains: Context providers and custom hooks
- Key files: `AuthContext.tsx`, `GraphContext.tsx`, `SearchContext.tsx`, `LayoutContext.tsx`, `SettingsContext.tsx`

**src/hooks/**
- Purpose: Custom React hooks for reusable logic
- Contains: Hooks for fetching, collaboration, shortcuts
- Key files: `useFetch.ts`, `useCollaboration.ts`, `useShortcuts.ts`

**src/server/**
- Purpose: Frontend API client
- Contains: Axios instance with auth interceptors
- Key files: `api.ts` (HTTP client), `auth.ts` (login/logout helpers)

**src/utils/**
- Purpose: Frontend utility functions
- Contains: Data processing, formatting, domain helpers
- Key files: `ideas.ts`, `graph.ts`, `search.ts`, `formatting.ts`, `processing.ts`

**shared/**
- Purpose: Code shared between frontend and backend
- Contains: TypeScript types, constants, editor config
- Key files: `types/idea.d.ts`, `types/user.d.ts`, `editing/tiptap/extensions.ts`

**tests/**
- Purpose: Automated test suites
- Contains: Integration tests for backend, component tests for frontend
- Key files: `setup.server.ts`, `api/search/`, `api/ideas/`

## Key File Locations

**Entry Points:**
- `app/index.ts`: Backend Express server
- `src/main.tsx`: Frontend React application
- `index.html`: HTML shell for SPA

**Configuration:**
- `package.json`: Scripts and dependencies
- `tsconfig.json`: TypeScript compiler options
- `vite.config.ts`: Vite bundler configuration
- `vitest.config.js`: Vitest test runner config
- `.env`: Environment variables (not in git)
- `.env.example`: Environment variable template

**Core Logic:**
- `app/api/index.ts`: API router aggregator
- `app/database/db.ts`: Database connection singleton
- `app/services/Graph.ts`: Graph operations and connectable abstraction
- `app/services/Search.ts`: Search and vector similarity
- `src/App.tsx`: Frontend routing configuration
- `src/contexts/AuthContext.tsx`: Authentication state

**Testing:**
- `tests/setup.server.ts`: Backend test environment setup
- `tests/setup.client.ts`: Frontend test environment setup
- `tests/api/`: Backend integration tests
- `src/components/**/*.test.tsx`: Frontend component tests (co-located)

## Naming Conventions

**Files:**
- Backend: `lowercase.ts` for utilities, `PascalCase.ts` for services/models
- Frontend Components: `PascalCase.tsx` for components
- Frontend Utilities: `camelCase.ts` for utilities
- Tests: `*.test.ts` or `*.spec.ts` suffix
- Types: `.d.ts` extension in `shared/types/`

**Directories:**
- Backend: `lowercase` for directories
- Frontend: `PascalCase` for component directories, `lowercase` for others
- Routers: Named after resource plural (e.g., `ideas`, `tasks`, `users`)

**Functions:**
- `camelCase` for functions and methods
- `PascalCase` for React components and class constructors

**Variables:**
- `camelCase` for variables
- `UPPER_SNAKE_CASE` for constants
- `PascalCase` for types and interfaces
- Interface prefix: `I` (e.g., `IUser`, `IIdea`, `ISafeUser`)

**Database Models:**
- `PascalCase` class name matching entity (e.g., `User`, `Idea`, `Task`)
- Static methods for queries (e.g., `User.get()`, `Idea.create()`)

## Where to Add New Code

**New REST Endpoint:**
- Primary code: `app/api/{resource}.ts` or `app/api/{resource}/index.ts`
- Tests: `tests/api/{resource}.test.ts`
- Add route to `app/api/index.ts`

**New Service/Business Logic:**
- Implementation: `app/services/{ServiceName}.ts`
- Export from `app/services/index.ts` if needs initialization

**New Database Model:**
- Implementation: `app/database/models/{entity}.ts`
- Export from `app/database/models/index.ts`
- Add migration in model's `up()` static method

**New Frontend Page:**
- Implementation: `src/pages/{Feature}/{PageName}.tsx`
- Add route in `src/App.tsx`
- Import any needed contexts

**New React Component:**
- Implementation: `src/components/{Category}/{ComponentName}.tsx`
- Co-located test: `src/components/{Category}/{ComponentName}.test.tsx`
- Styles: `{ComponentName}.module.scss` in same directory
- Categories: `UI/`, `Display/`, `Graph/`, `Search/`, `Forms/`, `Layout/`, `Utils/`

**New Context Provider:**
- Implementation: `src/contexts/{Feature}Context.tsx`
- Add to provider stack in `src/main.tsx`
- Export custom hook (e.g., `useFeature()`)

**New Hook:**
- Implementation: `src/hooks/use{Name}.ts`
- Use existing contexts when needed

**New Shared Type:**
- Implementation: `shared/types/{entity}.d.ts`
- Use in both `app/` and `src/`

**Utilities:**
- Backend helpers: `app/utils/{category}.ts`
- Frontend helpers: `src/utils/{category}.ts`
- Shared helpers: `shared/vars/{category}.ts`

**AI Integration:**
- LLM provider: `app/ai/lms/{provider}.ts`
- Embedding provider: `app/ai/embeddings/{provider}.ts`
- Register in `getLM()` or `getEmbedder()` factory

## Special Directories

**.planning/**
- Purpose: Documentation and planning artifacts
- Generated: Manually and by GSD commands
- Committed: Yes

**dist/**
- Purpose: Production build output from Vite
- Generated: Yes, by `vite build`
- Committed: No

**node_modules/**
- Purpose: Installed npm dependencies
- Generated: Yes, by `bun install`
- Committed: No

**conductor/**
- Purpose: Legacy planning/tracking system
- Generated: Manually
- Committed: Yes

**docker/**
- Purpose: Docker configuration for services
- Generated: No
- Committed: Yes

**public/**
- Purpose: Static assets served directly
- Generated: No (manually placed)
- Committed: Yes

**scripts/**
- Purpose: Build and automation scripts
- Generated: No
- Committed: Yes

**data/**
- Purpose: Local data files (archives)
- Generated: Mixed
- Committed: No (in .gitignore)

**db_backups/**
- Purpose: Database backup files
- Generated: Yes (by backup scripts)
- Committed: No

**credentials/**
- Purpose: Service account keys and secrets
- Generated: No
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-02-08*
