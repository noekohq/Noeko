# Noeko API reference

Noeko's implemented Developer API is described by an
[OpenAPI 3.1 document](../../app/api/v1/openapi.yaml). A running Noeko installation also serves the
same file at:

```text
GET /api/v1/openapi.yaml
```

Import that URL or the repository file into an OpenAPI-compatible client such as Postman, Insomnia,
Bruno, Swagger UI, or a client-code generator. The contract intentionally documents only endpoints
that exist; the broader [programmatic API design](../PROGRAMMATIC-API.md) includes proposed work.

## Authentication

Personal API credentials are bearer tokens and begin with `noeko_live_`:

```http
Authorization: Bearer noeko_live_...
```

Create credentials through the browser-authenticated `/api/v1/credentials` endpoint. The complete
secret is returned once. Store it in a secret manager or environment variable, never in source
control. Credential-management routes require a browser session token; API credentials cannot mint
or revoke other credentials.

Example:

```sh
curl https://noeko.example/api/v1/ideas \
  --header "Authorization: Bearer $NOEKO_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"title":"Captured by API","content":"A durable note."}'
```

## Webhook verification

Webhook requests include `Webhook-Timestamp` and `Webhook-Signature`. The signature is lowercase
hex HMAC-SHA256 over `<timestamp>.<raw-request-body>` using the webhook secret:

```text
v1=<hex-hmac-sha256>
```

Verify against the raw bytes before parsing JSON, use a constant-time comparison, reject stale
timestamps, and deduplicate retries by the payload event `id`. Any `2xx` response acknowledges a
delivery.
