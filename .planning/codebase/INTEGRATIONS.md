# External Integrations

**Analysis Date:** 2026-02-08

## APIs & External Services

**AI & Machine Learning:**
- Google Gemini - Language model generation
  - SDK/Client: `@google/genai` 1.20.0
  - Auth: `GEMINI_API_KEY` (API key mode) OR `GOOGLE_APPLICATION_CREDENTIALS` (Vertex AI mode)
  - Usage: LLM inference, JSON generation, streaming responses
  - Provider: `app/ai/lms/providers/google.ts`
  - Models: gemini-2.5-flash, gemini-3-pro, gemini-2.5-flash-lite

- Google Vertex AI - Enterprise AI platform
  - SDK/Client: `@google-cloud/vertexai` 1.10.0, `@google-cloud/aiplatform` 5.7.0
  - Auth: `GCP_PROJECT_ID`, `GCP_LOCATION`, `GOOGLE_APPLICATION_CREDENTIALS`
  - Usage: Text embeddings (768-dimensional vectors), model inference
  - Provider: `app/ai/embeddings/providers/google.ts`
  - Model: text-embedding-004/005 (configurable via `GOOGLE_EMBEDDING_MODEL_NAME`)
  - Rate limiting: Configurable RPM via `EMBEDDINGS_RPM_LIMIT`

- Google Auth Library - Authentication
  - SDK/Client: `google-auth-library` 10.3.0
  - Auth: Service account credentials file
  - Usage: OAuth, service account authentication

**Email:**
- MailBaby - Email delivery service
  - SDK/Client: `nodemailer` 7.0.6 + `axios` 1.12.2
  - Auth: `MAILBABY_API_KEY`, `MAILBABY_USERNAME`, `MAILBABY_PASSWORD`
  - API URL: `MAILBABY_API_URL` (https://api.mailbaby.net)
  - Implementation: `app/utils/mailbaby.ts`
  - Configuration: SMTP relay at relay.mailbaby.net:587 with connection pooling

**AI Providers (Alternate):**
- OpenAI SDK - Used for Grok API compatibility
  - SDK/Client: `openai` 5.22.0
  - Usage: Alternative LLM provider via OpenAI-compatible interface
  - Provider: `app/ai/lms/providers/grok.ts`

## Data Storage

**Databases:**
- SurrealDB
  - Connection: `DB_PROTOCOL://DB_HOST:DB_PORT`
  - Namespace: `DB_NAMESPACE` (default: "twig")
  - Database: `DB_DATABASE` (default: "twig")
  - Client: `surrealdb` 1.3.2
  - Implementation: `app/database/db.ts`
  - Docker service: surrealdb/surrealdb:latest
  - Volume: surrealdb_data (persistent), temp_backups (backups)

- Redis
  - Connection: `REDIS_HOST:REDIS_PORT`
  - Auth: `REDIS_PASSWORD`
  - Client: `bullmq` 5.58.5 (wrapper)
  - Usage: Job queue backend for task scheduling
  - Implementation: `app/services/Kernel.ts`
  - Note: Commented out in docker-compose.yml but required for BullMQ

**File Storage:**
- AWS S3
  - SDK/Client: Bun built-in S3Client
  - Auth: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
  - Configuration: `S3_REGION`, `S3_BUCKET`, `S3_ENDPOINT` (optional)
  - Implementation: `app/utils/aws/s3.ts`
  - Operations: Upload, delete, exists check, presigned URLs, streaming
  - Backup bucket: `DB_BACKUP_BUCKET_NAME`

**Caching:**
- None (no dedicated caching layer beyond Redis for job queues)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: Token generation/verification in `app/utils/crypto.ts`
  - Storage: HTTP-only cookies (`accessToken`)
  - Secret: `TOKEN_SECRET` environment variable
  - Library: `jsonwebtoken` 9.0.2
  - Cookie parsing: `cookie-parser` 1.4.7

**Authorization:**
- Custom RBAC system
  - Implementation: `app/services/Authorization.ts`
  - Access levels: editor, viewer
  - Resource-level permissions based on SurrealDB records

**Super Users:**
- Environment-based admin assignment
  - Configuration: `DEFAULT_SUPERUSERS` (comma-separated email list)

## Monitoring & Observability

**Error Tracking:**
- None (no dedicated error tracking service integrated)

**Logs:**
- Console-based logging
  - Custom logger: `app/services/Logger.ts`
  - Library: `chalk` 5.6.2 for terminal formatting
  - Job queue logging via BullMQ events

**Analytics:**
- None detected

## CI/CD & Deployment

**Hosting:**
- Not specified (self-hosted or containerized deployment)
  - Docker support: `docker-compose.yml`, `docker-compose.dev.yml`
  - Process manager: PM2 (`ecosystem.config.cjs`)

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc.)

**Deployment:**
- Docker-based deployment supported
  - Services: SurrealDB, optional Redis, optional web container
  - Production build: `bun run client:build` → `dist/` → served by Express

## Environment Configuration

**Required env vars:**
- `PORT` - Server port (default: 3024/3400)
- `NODE_ENV` - Environment (development/production/test)
- `TOKEN_SECRET` - JWT signing secret
- `DB_PROTOCOL`, `DB_HOST`, `DB_PORT`, `DB_NAMESPACE`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` - Database connection
- `CLIENT_ORIGIN` - CORS allowed origin
- `VITE_SERVER_LOCATION` - Frontend API endpoint
- `GEMINI_API_KEY` OR (`GCP_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS`) - AI provider auth
- `MAILBABY_API_KEY`, `MAILBABY_USERNAME`, `MAILBABY_PASSWORD`, `MAILBABY_API_URL` - Email service
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_BUCKET` - File storage

**Optional env vars:**
- `EMBEDDINGS_RPM_LIMIT` - Rate limiting for embeddings API
- `GCP_LOCATION` - Google Cloud region (default: us-west1)
- `GOOGLE_EMBEDDING_MODEL_NAME` - Override embedding model
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Job queue backend
- `S3_ENDPOINT` - Custom S3-compatible endpoint
- `MAX_LM_PROMPT_SIZE` - LLM prompt size limit
- `MAX_USER_NOTES` - User note creation limit

**Secrets location:**
- Environment variables (via `.env` file)
- Google credentials: File path in `GOOGLE_CREDENTIALS_LOCATION` (typically `./credentials/google-credentials.json`)

## Webhooks & Callbacks

**Incoming:**
- None detected (no webhook endpoints found)

**Outgoing:**
- None detected (no outgoing webhook calls found)

## Real-time Services

**WebSocket Server:**
- Hocuspocus (Yjs CRDT collaboration)
  - Server: `@hocuspocus/server` 3.4.0
  - Provider: `@hocuspocus/provider` 3.4.0 (client-side)
  - Implementation: `app/collaboration/index.ts`
  - Transport: WebSocket upgrade on Express server
  - Authentication: JWT cookie-based auth (`accessToken`)
  - Storage: Custom database extension persisting to SurrealDB
  - Throttling: 15 requests/second, 5 second ban time
  - Debounce: 500ms save delay
  - Document types: Ideas, Tasks

**WebSocket Library:**
- ws 8.18.3 - Core WebSocket implementation

## Developer Tools

**API Testing:**
- GitHub CLI available (`gh` command)
  - GitHub Project: `noekohq/1`
  - Usage: Query project items, filter by status/priority

---

*Integration audit: 2026-02-08*
