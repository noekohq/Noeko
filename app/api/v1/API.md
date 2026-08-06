# Developer API

The Developer API is Noeko's stable, automation-oriented boundary for personal scripts, agents,
integrations, and future third-party applications. It exposes user-scoped capabilities without
making the interface-oriented `/api/*` routes a public contract.

## Boundaries

- `/api/v1` owns public request and response shapes independently of database records and internal
  route handlers.
- API credentials act with the permissions of their owning user and may be restricted by scopes.
- Browser sessions may use the same routes so the interface and external clients can converge on
  the same domain services.
- Domain events live below the HTTP layer. They are intended to represent mutations from the
  interface, API credentials, imports, collaboration, and background work.
- Webhooks are one consumer of the domain-event stream. Internal asynchronous processing is
  another; webhook delivery must never block the originating mutation.
- Public API responses do not expose raw embeddings, editor synchronization state, encrypted
  secrets, or database implementation details as a supported contract.

## Contracts and related modules

- [`openapi.yaml`](./openapi.yaml) is the machine-readable contract for endpoints implemented now.
- [`documentation/PROGRAMMATIC-API.md`](../../../documentation/PROGRAMMATIC-API.md) owns the broader
  product design and proposed v1 surface.
- [`TODO.md`](./TODO.md) tracks implementation status, gaps, and unresolved delivery work.
- `app/services/IdeaService.ts` is the initial user-scoped domain-service boundary.
- `app/services/Automation.ts` dispatches durable domain events and delivers signed webhooks.

When an endpoint changes, update the OpenAPI contract in the same change. When the module's
boundaries or event semantics change, update this document; changing delivery status belongs in
`TODO.md`.
