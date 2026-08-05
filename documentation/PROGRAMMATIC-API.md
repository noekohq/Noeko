# Noeko Programmatic API

Status: Draft v0.1  
Audience: Noeko maintainers and prospective API consumers  
Base path: `/api/v1`

This document owns the target product design and records unresolved decisions. The contract for the
currently implemented endpoints is [`app/api/v1/openapi.yaml`](../app/api/v1/openapi.yaml), with a
consumer quick start in [`documentation/api/README.md`](./api/README.md). Features described here
may remain proposed until they appear in that OpenAPI document.

## Purpose

Expose the useful knowledge-management capabilities of Noeko to scripts, agents, integrations, and third-party applications without making the existing UI-oriented `/api/*` routes a permanent public contract.

The public API should make these initial workflows dependable:

1. Capture an idea from another application.
2. Read and incrementally synchronize a user's ideas.
3. Search a user's knowledge by text, meaning, or both.
4. Organize ideas with tags.
5. Create and inspect explicit graph connections.

The API is a product surface, not a direct serialization of SurrealDB records or the current Express handlers.

## Design principles

- **Stable contract:** `/api/v1` owns its request and response schemas. Internal models may change without changing the public API.
- **User-equivalent permissions:** an API credential can never access more than its owning user could access in the interface.
- **Least privilege:** credentials have explicit scopes and can be revoked independently.
- **Predictable HTTP semantics:** conventional methods, status codes, pagination, errors, and idempotency.
- **Safe defaults:** embeddings, derived content, collaborative editor state, and other internal fields are omitted unless intentionally exposed.
- **Automation-friendly:** opaque cursors, machine-readable errors, request IDs, and idempotent writes are first-class.
- **Self-hostable:** the contract must work without depending on Noeko's hosted control plane.

## Proposed v1 scope

### MVP

- API credential management in the Noeko interface
- Current credential/user inspection
- Ideas: create, retrieve, list, update, and delete
- Search across connectable knowledge
- Tags: create, retrieve, list, update, delete, apply, and remove
- Connections: create, list, and delete
- User-scoped webhook subscriptions backed by a general domain-event system

### Follow-on

- Tasks
- Sources and file upload/download
- Rabbitholes
- Spyglass runs and event streaming
- Import and export jobs
- OAuth 2.1 for third-party applications acting on behalf of multiple users

### Not proposed for v1

- User registration, login, password reset, or administration
- Raw embedding vectors
- Raw SurrealDB record IDs or relation records
- Yjs/editor synchronization state
- Internal derived-data cascade controls
- Full graph dumps intended for rendering the Constellation UI

## Resource naming

The existing product and code use **idea** for Noeko's note-like primary resource. The first API version should use `/ideas` as well, avoiding a second name for the same concept. Documentation can describe an idea as “a note in Noeko.”

Public IDs should be opaque strings. The server may currently represent a record as `idea:abc`, but clients must not infer resource type, database table, or other meaning from an ID.

Timestamps use RFC 3339 UTC strings, for example `2026-08-03T22:15:30.000Z`.

## Authentication and authorization

### Personal API credentials

The MVP uses personal API credentials created from the user's settings. A credential is shown once and sent as a bearer token:

```http
Authorization: Bearer noeko_live_...
```

Only a hash of the secret is stored. A credential record should include:

- ID and display name
- owner user ID
- hash and non-secret prefix for identification
- scopes
- creation, last-used, and optional expiration timestamps
- revocation timestamp

API credentials are distinct from the short-lived access JWT and refresh-token records used by the browser session. Query-string credentials are not accepted by `/api/v1`.

Suggested initial scopes:

| Scope               | Capability                                                 |
| ------------------- | ---------------------------------------------------------- |
| `profile:read`      | Inspect the credential's user identity                     |
| `ideas:read`        | List and retrieve accessible ideas                         |
| `ideas:write`       | Create, update, and delete owned ideas                     |
| `search:read`       | Search accessible knowledge                                |
| `tags:read`         | List tags and tag assignments                              |
| `tags:write`        | Manage owned tags and assignments                          |
| `connections:read`  | Inspect connections between accessible resources           |
| `connections:write` | Manage connections when the user has edit access           |
| `webhooks:read`     | Inspect webhook endpoints and delivery attempts            |
| `webhooks:write`    | Create, update, rotate, test, and delete webhook endpoints |

Destructive operations require the corresponding write scope; there is no separate delete scope in the MVP.

### Permission behavior

- List and search operations return only resources the user may view.
- Retrieve operations return `404 not_found` when the resource does not exist **or** the credential cannot view it. This avoids revealing private resource IDs.
- Updates require editor access.
- Deletes require ownership.
- Tag and connection mutations validate access to every referenced resource.
- A suspended user receives `403 account_disabled`, even when the credential itself is valid.

## HTTP conventions

### Success envelopes

Single resource:

```json
{
  "data": {
    "id": "01K1...",
    "object": "idea"
  }
}
```

Collection:

```json
{
  "data": [],
  "page": {
    "next_cursor": "opaque-cursor-or-null",
    "has_more": false
  }
}
```

Use `200 OK` for reads and updates, `201 Created` for creates, and `204 No Content` for deletes. Creation responses include a `Location` header.

### Errors

```json
{
  "error": {
    "type": "invalid_request",
    "code": "invalid_field",
    "message": "title must be 1 to 500 characters",
    "param": "title",
    "request_id": "req_01K1..."
  }
}
```

Initial error types:

- `authentication_error` — `401`
- `permission_error` — `403`
- `not_found` — `404`
- `conflict` — `409`
- `invalid_request` — `400` or `422`
- `rate_limit_error` — `429`
- `internal_error` — `500`

Every response includes `X-Request-Id`. Rate-limited responses include `Retry-After` and standard rate-limit headers once limits are defined.

### Pagination and ordering

Collection endpoints use cursor pagination:

- `limit`: default `50`, maximum `100`
- `after`: opaque cursor returned by the preceding response
- `order`: `created_at`, `updated_at`, or `viewed_at`
- `direction`: `asc` or `desc`; default `desc`

Offset pagination is not part of the public contract. For incremental synchronization, clients use `updated_after` plus a stable `(updated_at, id)` cursor.

### Idempotency and concurrency

`POST` endpoints accept `Idempotency-Key`. The same credential, route, key, and request body return the original result for at least 24 hours. Reusing a key with a different body returns `409 idempotency_conflict`.

Resources expose an `etag`. Updates accept `If-Match`; a stale value returns `412 precondition_failed`. This prevents automations from silently overwriting edits made in the interface.

## Endpoints

### Identity

| Method | Path         | Scope          | Purpose                                        |
| ------ | ------------ | -------------- | ---------------------------------------------- |
| `GET`  | `/api/v1/me` | `profile:read` | Return the credential owner and granted scopes |

### Ideas

| Method   | Path                      | Scope         | Purpose                  |
| -------- | ------------------------- | ------------- | ------------------------ |
| `POST`   | `/api/v1/ideas`           | `ideas:write` | Create an idea           |
| `GET`    | `/api/v1/ideas`           | `ideas:read`  | List accessible ideas    |
| `GET`    | `/api/v1/ideas/{idea_id}` | `ideas:read`  | Retrieve an idea         |
| `PATCH`  | `/api/v1/ideas/{idea_id}` | `ideas:write` | Partially update an idea |
| `DELETE` | `/api/v1/ideas/{idea_id}` | `ideas:write` | Delete an owned idea     |

Create request:

```json
{
  "title": "API design notes",
  "content": "Start with capture, search, and graph operations.",
  "content_format": "markdown",
  "visibility": "private",
  "tag_ids": ["01K1TAG..."]
}
```

Idea response:

```json
{
  "data": {
    "id": "01K1IDEA...",
    "object": "idea",
    "title": "API design notes",
    "content": "Start with capture, search, and graph operations.",
    "content_format": "markdown",
    "visibility": "private",
    "access": "owner",
    "created_at": "2026-08-03T22:15:30.000Z",
    "updated_at": "2026-08-03T22:15:30.000Z",
    "content_updated_at": "2026-08-03T22:15:30.000Z",
    "etag": "W/\"idea-7-01K1...\""
  }
}
```

Open issue: the editor currently persists rich HTML and collaborative state. Before implementation, `content_format` must be finalized. The recommended boundary is to accept `markdown` and `html`, return the stored canonical format, and never expose `yState`. Format conversion must not be silent or lossy.

Creating an idea triggers normal embedding/derived-data processing asynchronously. The create succeeds once the durable idea exists; compute state may be returned as:

```json
{
  "processing": {
    "status": "pending"
  }
}
```

Clients do not upload embeddings or invoke the internal cascade endpoints.

### Search

| Method | Path             | Scope         | Purpose                                 |
| ------ | ---------------- | ------------- | --------------------------------------- |
| `POST` | `/api/v1/search` | `search:read` | Search accessible connectable resources |

```json
{
  "query": "notes about reliable API retries",
  "mode": "hybrid",
  "types": ["idea"],
  "limit": 20,
  "filters": {
    "tag_ids": ["01K1TAG..."],
    "updated_after": "2026-07-01T00:00:00.000Z"
  }
}
```

`mode` is `keyword`, `semantic`, or `hybrid` (default). Results contain a normalized `score`, resource summary, and optional highlight. Implementation-specific vector thresholds and debug scores are not stable public fields.

### Tags

| Method   | Path                                    | Scope                    | Purpose                  |
| -------- | --------------------------------------- | ------------------------ | ------------------------ |
| `POST`   | `/api/v1/tags`                          | `tags:write`             | Create a tag             |
| `GET`    | `/api/v1/tags`                          | `tags:read`              | List owned tags          |
| `GET`    | `/api/v1/tags/{tag_id}`                 | `tags:read`              | Retrieve a tag           |
| `PATCH`  | `/api/v1/tags/{tag_id}`                 | `tags:write`             | Update a tag             |
| `DELETE` | `/api/v1/tags/{tag_id}`                 | `tags:write`             | Delete a tag             |
| `PUT`    | `/api/v1/ideas/{idea_id}/tags/{tag_id}` | `ideas:write tags:write` | Idempotently apply a tag |
| `DELETE` | `/api/v1/ideas/{idea_id}/tags/{tag_id}` | `ideas:write tags:write` | Remove a tag assignment  |

The nested tag-assignment route is intentionally idempotent. A later generalized API can use `/resources/{type}/{id}/tags/{tag_id}` when tasks, sources, and excerpts are public.

### Connections

| Method   | Path                                  | Scope               | Purpose                                |
| -------- | ------------------------------------- | ------------------- | -------------------------------------- |
| `POST`   | `/api/v1/connections`                 | `connections:write` | Create a directed connection           |
| `GET`    | `/api/v1/connections`                 | `connections:read`  | List connections, filtered by resource |
| `DELETE` | `/api/v1/connections/{connection_id}` | `connections:write` | Delete a connection                    |

```json
{
  "from": { "type": "idea", "id": "01K1SOURCE..." },
  "to": { "type": "idea", "id": "01K1TARGET..." }
}
```

Creating an existing directed connection returns the existing connection with `200 OK`; creating a new one returns `201 Created`. Self-connections are rejected. The API should state whether direction is semantically meaningful before other connectable types are added.

### Webhook subscriptions

Webhooks are the externally delivered portion of a broader event system. Events must be produced for mutations originating from the interface, public API, imports, background processing, collaboration, and future integrations—not only from `/api/v1` handlers.

| Method   | Path                                             | Scope            | Purpose                              |
| -------- | ------------------------------------------------ | ---------------- | ------------------------------------ |
| `POST`   | `/api/v1/webhooks`                               | `webhooks:write` | Create a webhook subscription        |
| `GET`    | `/api/v1/webhooks`                               | `webhooks:read`  | List the user's subscriptions        |
| `GET`    | `/api/v1/webhooks/{webhook_id}`                  | `webhooks:read`  | Retrieve a subscription              |
| `PATCH`  | `/api/v1/webhooks/{webhook_id}`                  | `webhooks:write` | Update event filters or status       |
| `DELETE` | `/api/v1/webhooks/{webhook_id}`                  | `webhooks:write` | Delete a subscription                |
| `POST`   | `/api/v1/webhooks/{webhook_id}/rotate-secret`    | `webhooks:write` | Rotate its signing secret            |
| `POST`   | `/api/v1/webhooks/{webhook_id}/test`             | `webhooks:write` | Queue a test event                   |
| `GET`    | `/api/v1/webhooks/{webhook_id}/deliveries`       | `webhooks:read`  | Inspect delivery status and attempts |
| `POST`   | `/api/v1/webhook-deliveries/{delivery_id}/retry` | `webhooks:write` | Retry a failed delivery              |

Create request:

```json
{
  "url": "https://automation.example.com/noeko",
  "events": ["idea.created", "idea.updated", "idea.processing.completed"]
}
```

The generated signing secret is returned only on creation and rotation. A subscription belongs to one user. It receives only events whose resources that user owns or can access according to the event's documented audience policy. API credentials manage subscriptions on behalf of their owning user; subscriptions are not owned by the credential and continue to exist if that credential is revoked.

Initial public event types:

- `idea.created`
- `idea.updated`
- `idea.deleted`
- `idea.processing.completed`
- `idea.processing.failed`
- `tag.created`, `tag.updated`, and `tag.deleted`
- `tag.applied` and `tag.removed`
- `connection.created` and `connection.deleted`

Event names are namespaced and payloads are versioned independently. Internal events may be more granular than public webhook events; only explicitly registered public event contracts can leave the server.

Webhook payload:

```json
{
  "id": "evt_01K1...",
  "object": "event",
  "type": "idea.processing.completed",
  "version": 1,
  "occurred_at": "2026-08-03T22:16:04.000Z",
  "user_id": "usr_01K1...",
  "actor": {
    "type": "api_credential",
    "id": "key_01K1..."
  },
  "data": {
    "resource": {
      "id": "01K1IDEA...",
      "object": "idea"
    }
  }
}
```

Deliveries are at-least-once. Consumers deduplicate using the event `id`. Ordering is preserved on a best-effort basis per subscription, but consumers must tolerate retries and out-of-order delivery.

Requests include:

```http
Webhook-Id: wh_01K1...
Webhook-Event-Id: evt_01K1...
Webhook-Timestamp: 1785795364
Webhook-Signature: v1=<hex-hmac-sha256>
```

The signature covers `<timestamp>.<raw request body>`. Consumers should reject stale timestamps. A `2xx` response acknowledges delivery. Redirects are not followed. Timeouts, network errors, and other status codes are retried with exponential backoff and jitter. After a defined failure threshold the subscription is disabled and an internal `webhook.disabled` event is recorded.

Hosted deployments should require HTTPS and block loopback, link-local, private-network, and metadata-service destinations after DNS resolution. Self-hosted administrators may explicitly opt into private-network destinations. Delivery logs must redact secrets, authorization headers, and response bodies by default.

## Event architecture

The implementation uses a transactional outbox so a resource mutation and its event cannot diverge:

1. A user-scoped domain service validates authorization and performs the mutation.
2. In the same SurrealDB transaction, it writes an immutable `domain_event` outbox record.
3. The request returns after the durable mutation commits; it does not wait for webhook delivery or asynchronous computation.
4. An event dispatcher claims undispatched events using a lease.
5. Internal subscribers enqueue or perform work such as embedding generation and derived-data processing.
6. The webhook projector matches public events against user subscriptions and creates immutable `webhook_delivery` records.
7. A delivery worker claims due deliveries, sends signed HTTP requests, records attempts, and schedules retries.

Core records:

- `domain_event`: ID, type, version, owner/audience user ID, actor, resource reference, payload, occurrence time, and dispatch state.
- `webhook`: user ID, URL, encrypted signing secret, subscribed event patterns, enabled state, and timestamps.
- `webhook_delivery`: webhook ID, event ID, status, attempt count, next-attempt time, lease owner/expiry, response status, and sanitized error.
- `webhook_delivery_attempt`: optional append-only history for operational inspection.

The event dispatcher is an application service initialized by `initServices()`. Its durable claim/lease/recovery mechanics should be extracted from or modeled after `SpyglassRunWorker`, which already proves this approach in the current codebase. The existing BullMQ `Kernel` can remain an optional future execution adapter, but the authoritative event and delivery state stays in SurrealDB so standard self-hosted installations do not require Redis.

Domain events are emitted below the HTTP layer. The public API routes and existing UI routes should converge on user-scoped services such as `IdeaService.create(actor, input)` rather than independently calling models and remembering to emit events. Model methods remain responsible for persistence; services own authorization, transaction boundaries, and event meaning.

The actor context records both the effective user and origin, for example `interface`, `api_credential`, `import`, `system`, or `collaborator`. This provides auditability without changing the rule that data access is evaluated in the user's scope.

Event payloads should contain the minimum stable data needed by consumers. Large content and sensitive fields are omitted by default; consumers retrieve the latest resource through the API when necessary. Delete events include an ID, type, and tombstone metadata because the resource can no longer be fetched.

## Processing and consistency

An idea write has two layers:

1. The idea and explicit relationships are committed synchronously.
2. Embeddings, semantic indexes, suggested tags, and derived summaries are updated asynchronously.

The second layer is triggered by persisted domain events rather than route-local fire-and-forget calls. Completion and failure create new domain events, enabling both internal reactions and subscribed webhooks without coupling either concern to the original request.

Read-after-write is guaranteed for the idea itself. Semantic search is eventually consistent. Responses expose processing status rather than pretending semantic indexes are immediately current.

When processing needs explicit inspection, add `GET /api/v1/operations/{operation_id}` as a general job resource rather than resource-specific polling endpoints.

## Versioning and compatibility

- The major version is in the path.
- Additive optional fields and new endpoints do not require a new major version.
- Removing or renaming a field, changing its meaning/type, or tightening accepted input incompatibly requires a new major version.
- Unknown response fields must be ignored by clients.
- Deprecated fields receive a documented migration period and `Sunset`/`Deprecation` headers where applicable.
- An OpenAPI 3.1 document should be the source of truth before the first endpoint is considered stable.

## Observability, limits, and safety

- Structured audit events record credential ID, user ID, request ID, action, resource, status, and latency; never the credential secret.
- Request bodies and idea content are not logged by default.
- Body-size limits are endpoint-specific.
- Initial rate limits should distinguish lightweight reads, writes, semantic search, and generative operations.
- Credentials can be expired and revoked immediately.
- Deleting a credential does not delete resources created with it.
- Webhook delivery metrics include queue depth, event age, success rate, retry count, and disabled subscriptions.

## Open product decisions

These decisions should be resolved before converting this draft to OpenAPI:

1. **Primary audience:** personal scripts and single-user integrations first, or third-party multi-user applications from day one?
2. **Content contract:** markdown, HTML, TipTap JSON, or a small accepted set with an explicit canonical representation?
3. **External naming:** retain the product term `idea`, or present `note` externally and maintain a permanent translation layer?
4. **Shared content:** should list/search include resources shared with the user by default, behind `include_shared=true`, or not in the MVP?
5. **Compute economics:** which semantic/generative calls require separate scopes, quotas, or server-admin enablement?
6. **Deletion:** immediate hard delete, recoverable trash, or a soft-delete period?
7. **Connection meaning:** directed edges as currently modeled, or an undirected public abstraction?
8. **Hosted versus self-hosted policy:** common default limits, or installation-defined limits advertised by response headers?
9. **Webhook audience:** should events for shared resources go to every currently authorized user, only the owner, or subscriptions explicitly configured for shared activity?
10. **Retention:** how long should domain events, delivery records, and attempt history be retained?

## Suggested implementation sequence

1. Resolve the content, audience, shared-resource, and deletion decisions above.
2. Write the OpenAPI 3.1 contract and example fixtures.
3. Add actor context and user-scoped domain services so UI and public API mutations share authorization and event behavior.
4. Add the transactional domain-event outbox, dispatcher, and internal subscriber registry.
5. Add webhook subscriptions, signed delivery, retries, inspection, and destination safety controls.
6. Add a dedicated API credential model and authentication middleware; do not extend browser JWT behavior.
7. Add shared v1 response/error/pagination utilities.
8. Implement ideas and `/me` through the shared service layer.
9. Add search, tags, and connections.
10. Add integration tests against the dedicated test database for each critical workflow.
11. Publish a minimal TypeScript client generated from the OpenAPI document.

## Acceptance criteria for the MVP

- A user can create and revoke a scoped credential in the interface.
- A script can create an idea exactly once despite a retried request.
- A script can incrementally list ideas without missing or duplicating changes.
- A stale update cannot overwrite a newer interface edit without an explicit retry decision.
- Search never returns a resource the credential owner cannot view.
- Tag and connection mutations enforce both scopes and resource-level permissions.
- Interface, API, import, and background mutations produce the same documented domain events.
- A committed mutation always has a corresponding event, including after process failure or restart.
- Webhooks are signed, delivered at least once, recover after restarts, and expose sanitized attempt history.
- Internal async processing and external webhooks consume the same durable event stream without blocking writes.
- All endpoints use the common error shape and request ID.
- The OpenAPI contract, implementation, and integration tests agree.
