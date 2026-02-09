# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**
- TypeScript - Full-stack application (frontend and backend)

**Secondary:**
- JavaScript - Configuration files (`vitest.config.js`, `postcss.config.cjs`)

## Runtime

**Environment:**
- Bun 1.3.8 - Runtime and package manager

**Package Manager:**
- Bun (primary) - Declared in `package.json`
- Lockfile: Present (yarn.lock - though bun is preferred per AGENTS.md)

## Frameworks

**Core:**
- React 19.1.1 - Frontend framework
- Express 5.1.0 - Backend HTTP server
- Vite 7.1.6 - Frontend build tool and dev server

**Testing:**
- Vitest 4.0.17 - Frontend test runner (jsdom environment)
- Bun Test (built-in) - Backend test runner
- @testing-library/react 16.3.2 - Component testing utilities
- Supertest 7.2.2 - API integration testing

**Build/Dev:**
- TypeScript 5.9.2 - Type checking and compilation
- @vitejs/plugin-react 5.0.3 - React support in Vite
- vite-plugin-pwa 1.0.3 - Progressive Web App capabilities
- PostCSS 8.5.6 - CSS processing
- Sass 1.92.1 - Stylesheet preprocessing

## Key Dependencies

**Critical:**
- surrealdb 1.3.2 - Primary database client
- @google/genai 1.20.0 - Google AI/Gemini integration (LLM & embeddings)
- @hocuspocus/server 3.4.0 - Real-time collaboration server
- @hocuspocus/provider 3.4.0 - Client-side collaboration provider
- yjs 13.6.27 - CRDT for collaborative editing
- bullmq 5.58.5 - Job queue system (requires Redis)

**UI Framework:**
- @mantine/core 8.2.2 - Component library
- @mantine/hooks 8.2.2 - React hooks collection
- @mantine/notifications 8.2.2 - Notification system
- @mantine/modals 8.2.2 - Modal management
- @mantine/form 8.2.2 - Form handling

**Rich Text Editing:**
- @tiptap/react 3.4.4 - React adapter for Tiptap
- @tiptap/starter-kit 3.4.4 - Core extensions bundle
- @tiptap/extension-collaboration 3.10.7 - Real-time collaboration
- @tiptap/html 3.10.7 - HTML conversion utilities
- tiptap-markdown 0.9.0 - Markdown support

**Infrastructure:**
- axios 1.12.2 - HTTP client
- jsonwebtoken 9.0.2 - JWT authentication
- cookie-parser 1.4.7 - Cookie handling
- cors 2.8.5 - CORS middleware
- dotenv 17.2.2 - Environment variable management
- ws 8.18.3 - WebSocket server
- nodemailer 7.0.6 - Email sending
- multer 2.0.2 - File upload handling

**Utilities:**
- zod 4.1.12 - Runtime type validation
- dayjs 1.11.18 - Date manipulation
- lodash 4.17.21 - Utility functions
- uuid 13.0.0 - UUID generation
- chalk 5.6.2 - Terminal output styling

**PDF Handling:**
- @embedpdf/core 1.2.1 - PDF rendering core
- pdfjs-dist 5.4.149 - PDF.js library
- Multiple @embedpdf plugins (annotation, render, scroll, zoom, etc.)

**Data Visualization:**
- d3 7.9.0 - Visualization library
- d3-force 3.0.0 - Force-directed graphs
- recharts 3.2.1 - React chart library
- @mantine/charts 8.2.2 - Mantine chart components

**Content Processing:**
- cheerio 1.1.2 - HTML parsing
- marked 16.3.0 - Markdown parser
- react-markdown 10.1.0 - React markdown renderer
- turndown 7.2.1 - HTML to Markdown converter
- minisearch 7.2.0 - Client-side search

## Configuration

**Environment:**
- Uses dotenv for environment variable management
- Three environment files: `.env`, `.env.example`, `.env.test`
- Critical variables: `PORT`, `NODE_ENV`, `TOKEN_SECRET`, database connection, API keys

**TypeScript:**
- Config: `tsconfig.json`, `tsconfig.node.json`
- Target: ESNext
- Module: ESNext with bundler resolution
- Strict mode enabled
- JSX: react-jsx

**Build:**
- Frontend: `vite.config.ts` - Vite with React plugin and PWA support
- Backend: Bun direct execution (`bun app/index.ts`)
- Production: Static files served from `dist/` by Express

**Testing:**
- Frontend: `vitest.config.js` - jsdom environment, setup in `tests/setup.client.ts`
- Backend: Bun test with `--test-sequential`, setup in `tests/setup.server.ts`
- Test database uses `_test` suffix on database name

**Linting/Formatting:**
- PostCSS: `postcss.config.cjs` with Mantine preset
- Sass preprocessing enabled

## Platform Requirements

**Development:**
- Bun 1.3.8+
- Docker and Docker Compose (for SurrealDB)
- Node.js environment variables (PORT, DB credentials, API keys)

**Production:**
- Bun runtime
- SurrealDB instance
- Redis instance (for BullMQ job queue)
- Environment variables for all third-party services
- Google Cloud credentials file (optional, for Vertex AI)

**Containerization:**
- Docker Compose files: `docker-compose.yml`, `docker-compose.dev.yml`
- Services: SurrealDB (active), Redis (commented), Web (commented)
- PM2 configuration: `ecosystem.config.cjs`

---

*Stack analysis: 2026-02-08*
