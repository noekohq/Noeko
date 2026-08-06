# Embedding Providers and Changeovers

Noeko keeps embeddings on the records they describe while centralizing provider
selection, vector validation, lifecycle metadata, and rebuild orchestration.
This preserves direct graph and vector queries without tying record models to a
single embedding vendor.

## Current architecture

```text
environment
  -> provider config
  -> provider factory
  -> Google, OpenAI, or deterministic provider
  -> lifecycle metadata and vector validation
  -> model adapter
  -> embeddings field on each record
```

The important files are:

| Responsibility                              | Location                          |
| ------------------------------------------- | --------------------------------- |
| Supported providers and runtime config      | `app/ai/embeddings/config.ts`     |
| Provider construction and caching           | `app/ai/embeddings/embeddings.ts` |
| Provider contract                           | `app/ai/embeddings/index.ts`      |
| Provider implementations                    | `app/ai/embeddings/providers/`    |
| Profile, content hash, and status lifecycle | `app/ai/embeddings/lifecycle.ts`  |
| Vector conversion and dimension checks      | `app/ai/embeddings/vectors.ts`    |
| Table-specific content adapters             | `app/ai/embeddings/models.ts`     |
| Operational CLI                             | `scripts/embeddings.ts`           |

The managed tables are `idea`, `tag`, `task`, `source`, and `excerpt`. Their
vectors remain in each record's `embeddings` field.

Each managed record may also contain:

- `embeddingsProvider`
- `embeddingsModel`
- `embeddingsDimension`
- `embeddingsContentHash`
- `embeddingsStatus` (`ready`, `stale`, or `failed`)
- `embeddingsError`
- `embeddingsUpdatedAt`

An embedding is current only when the vector exists, the provider/model/
dimension match the active profile, the content hash matches the current
embeddable text, and the status is `ready`.

## Configuration

The common settings are:

```dotenv
EMBEDDINGS_PROVIDER="google"
EMBEDDINGS_MODEL="text-embedding-005"
EMBEDDINGS_DIMENSION=768
EMBEDDINGS_RPM_LIMIT=1000
```

| Provider        | Required configuration                                | Notes                                                                                               |
| --------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `google`        | `GEMINI_API_KEY`, or Google Cloud project credentials | `GOOGLE_EMBEDDING_MODEL_NAME` overrides `EMBEDDINGS_MODEL`; Google defaults to `text-embedding-005` |
| `openai`        | `OPENAI_API_KEY`                                      | Defaults to `text-embedding-3-small`; requests the configured output dimension                      |

Semantic similarity cutoffs shared by search and proactive organization live in
`shared/constants/semantic.ts`. Recalibrate these constants when changing embedding providers,
models, dimensions, or the text used to construct embeddings; cosine similarity is not a calibrated
probability and its useful operating range can move between vector spaces.
| `deterministic` | None                                                  | Stable local vectors for development and automated tests; not semantically meaningful               |

The provider factory caches instances by provider, model, and dimension for the
life of the process. Restart application and CLI processes after changing
environment values.

Persisted vectors are plain `number[]` values because that is the SurrealDB
boundary format. Providers may use `Float32Array` internally; conversion occurs
at the persistence/query boundary, where vector length is also validated.

## Operational commands

| Task                                                           | Command                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Check lifecycle status for every table                         | `bun run embeddings:status`                                                 |
| Mark every managed table stale                                 | `bun run embeddings:stale`                                                  |
| Rebuild every stale record in stable batches                   | `bun run embeddings:rebuild`                                                |
| Target one table and bounded range                             | `bun run scripts/embeddings.ts rebuild --table idea --limit 1000 --start 0` |
| Change the batch size                                          | `bun run embeddings:rebuild --batchSize 250`                                |
| Preview the full rebuild without writes or embedding API calls | `bun run embeddings:rebuild --dryRun`                                       |
| Rebuild current records too                                    | `bun run embeddings:rebuild --force`                                        |
| Show CLI help                                                  | `bun run scripts/embeddings.ts --help`                                      |

`status` and `rebuild` automatically page through every selected table in a
stable ID order. `--batchSize` controls the database page size and defaults to 100. `--limit` optionally bounds the total records scanned per table, while
`--start` resumes from a known offset. Progress is printed after every batch.
Rebuilds skip records that already match the current profile, so rerunning an
interrupted command safely resumes the migration without regenerating completed
vectors.

`mark-stale` updates all records in the selected table; it is not paginated.
The rebuild command normally skips current records, so `--force` is needed only
when the same profile must be regenerated. A dry run still constructs the
configured provider, so required credentials must be present even though no
embedding request is sent.

## Provider changeover runbook

Use a maintenance window for a production changeover. Current semantic search
queries do not filter by lifecycle status or provider profile, so leaving the
application live during a rebuild can mix old and new vector spaces.

### Provider or model change with the same dimension

1. Back up the database.
2. Record the old provider, model, dimension, and credentials location.
3. Stop application workers that create embeddings or perform semantic search.
4. Configure the new provider credentials and set `EMBEDDINGS_PROVIDER`,
   `EMBEDDINGS_MODEL`, and the unchanged `EMBEDDINGS_DIMENSION`.
5. Confirm the provider can initialize:

   ```sh
   bun run scripts/embeddings.ts status --table idea --limit 1
   ```

6. Preview the affected records:

   ```sh
   bun run scripts/embeddings.ts rebuild --table idea --limit 100 --dryRun
   ```

7. Mark all managed embeddings stale with an auditable reason:

   ```sh
   bun run scripts/embeddings.ts mark-stale --reason provider-switch
   ```

8. Rebuild `idea`, `tag`, `task`, `source`, and `excerpt` with the consolidated
   command:

   ```sh
   bun run embeddings:rebuild
   ```

9. Run a full status check. Investigate every `failed` record and confirm
   all non-empty records are `ready` under the new profile.
10. Perform representative semantic searches, then restart the application.

Records are automatically considered stale when their stored provider, model,
dimension, or content hash differs from the active profile. Explicitly marking
them stale makes the transition visible to operators before rebuilding.

### Dimension change

The provider layer accepts any positive configured dimension, but the current
SurrealDB HNSW indexes in `app/services/Search.ts` are defined with
`DIMENSION 768`. A dimension change is therefore not an environment-only
operation.

Before changing `EMBEDDINGS_DIMENSION`:

1. Add and review a database migration that removes and recreates every
   affected vector index at the new dimension.
2. Audit `idea`, `tag`, `task`, `source`, and `excerpt`, plus the derived
   rabbithole/tag vector index behavior in `Search.up()`.
3. Plan how old vectors will be cleared or isolated while indexes are rebuilt.
4. Take the application offline, apply the index migration, and rebuild every
   embedding under the new profile.
5. Verify index definitions and semantic-search behavior before reopening
   traffic.

Until that index migration exists, supported provider/model changeovers must
retain dimension 768.

## Adding a provider

Humans and agents adding a provider should:

1. Implement `EmbeddingsProvider` in `app/ai/embeddings/providers/`.
2. Accept `EmbeddingsConfig` in the constructor and expose stable `provider`,
   `model`, `dimension`, and `supportsBatch` metadata.
3. Validate required credentials during construction with a clear error.
4. Return vectors through `toPersistedVector` so dimension mismatches fail at
   the provider boundary.
5. Add the provider key to `SupportedEmbeddingProviders`.
6. Register provider construction in `createProvider`.
7. Document environment variables in `.env.example` without real secrets.
8. Use deterministic vectors in standard tests. Keep real-provider diagnostics
   explicit, local-only, and opt-in.

Provider implementations must preserve input ordering for batch results, return
empty vectors at the configured dimension, and avoid silently accepting vectors
with the wrong length.

## Adding an embeddable model

To add another table to global changeover tooling:

1. Extend `EmbeddableTable` in `app/ai/embeddings/models.ts`.
2. Add a model adapter with deterministic `getEmbeddableContent`.
3. Add embedding metadata fields through a migration.
4. Ensure normal create/update paths use the lifecycle helpers.
5. Add or update the table's fixed-dimension vector index through a migration.
6. Verify status, stale marking, rebuild, failure recording, and semantic
   search for that table.

The content builder is part of embedding identity. Changing its formatting
changes the content hash and intentionally makes existing records stale.

## Recovery and known limitations

- A failed rebuild stores `embeddingsStatus = "failed"`, clears the vector, and
  records the error. Fix the provider or content issue and rerun that page.
- Existing records without lifecycle metadata are treated as stale.
- Rebuilds are synchronous and record-by-record at the provider boundary. They
  are resumable by rerunning the command, but they are not durable background
  jobs and stop when the process exits.
- Pagination uses a stable ID order. Avoid high-volume concurrent inserts or
  deletes during a full rebuild because offset-based pages can still shift.
- Tag-to-connectable recommendations blend the tag embedding with a centroid
  derived from the tag's currently described items. The recommendation path
  recomputes that centroid from current vectors instead of trusting the legacy
  `cachedCentroidEmbeddings` field, so provider changes and item re-embedding do
  not mix vector spaces.
- The deterministic provider proves generation, storage, validation, and query
  plumbing only. It does not prove semantic relevance.
- `rabbithole` is not currently in the embeddable model registry even though
  search defines a related vector index. Audit derived vectors separately
  during provider and dimension changes.
