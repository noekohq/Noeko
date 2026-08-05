# Developer API delivery

## Verified current state

- `/api/v1` accepts personal API credentials and browser-session bearer tokens.
- Browser-authenticated users can create, list, and revoke scoped personal API credentials.
- Credential secrets are hashed at rest and returned only when created.
- `/me` and idea CRUD are available with scope checks and user-level authorization.
- User-scoped webhook subscriptions support create, list, retrieve, update, delete, test delivery,
  and delivery inspection.
- Domain events and webhook delivery jobs are durable SurrealDB records with lease-based recovery.
- Webhook requests use HMAC-SHA256 signatures, retry with backoff, and disable repeatedly failing
  subscriptions.
- The implemented surface is described by OpenAPI 3.1 and served at `/api/v1/openapi.yaml`.

## Near-term work

- Add the settings UI for creating and revoking credentials and managing webhooks.
- Add integration tests for credential authentication, idea CRUD, webhook ownership, signatures,
  delivery retry behavior, and private-network destination blocking.
- Move every interface idea mutation through `IdeaService`; create uses it today, but other paths
  still bypass the event boundary.
- Make resource mutation and domain-event creation atomic. They are currently separate durable
  writes rather than a transactional outbox commit.
- Add shared response/error helpers so every error includes the request ID and one stable schema.
- Replace offset-style `start` pagination with the proposed opaque cursor contract.
- Implement idempotency keys and optimistic concurrency before calling write endpoints stable.
- Define retention and cleanup for domain events and webhook deliveries.
- Add secret rotation and manual delivery retry endpoints.

## Later surface

- Search, tags, and connections.
- Tasks, sources, files, Rabbitholes, Spyglass runs, imports, and exports.
- Processing-operation inspection and event streaming.
- Generated client libraries after the contract stabilizes.
- OAuth for applications acting on behalf of multiple users.

## Open decisions

- Canonical public idea content format.
- Whether shared content is included by default and which users receive its events.
- Hosted and self-hosted rate-limit policy.
- Domain-event and delivery-log retention.
- Public-ID representation independent of SurrealDB record IDs.
