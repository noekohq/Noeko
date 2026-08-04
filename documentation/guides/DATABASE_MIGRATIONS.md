# Database Migrations

Noeko uses ordered, reversible TypeScript migrations for intentional database
changes. This guide is both an operator runbook and a set of invariants for
contributors and coding agents.

## Quick reference

| Task | Command |
| --- | --- |
| Show applied and pending migrations | `bun run db:migration:status` |
| Apply all pending migrations | `bun run db:migrate` |
| Roll back the latest migration | `bun run db:rollback` |
| Roll back multiple migrations | `bun run scripts/migrateDB.ts rollback --steps 2` |
| Show CLI help | `bun run scripts/migrateDB.ts --help` |

All commands use the `DB_*` values in the active environment. Confirm the
namespace and database before running a command against shared or production
data.

## How it works

Migration definitions live in `app/database/migrations/` and are registered in
`app/database/migrations/index.ts`. The registry is sorted by migration ID, so
IDs determine execution order.

Applied migrations are recorded in the `schema_migration` table with:

- the migration ID and description;
- a SHA-256 checksum of its ID, description, `up`, and `down` functions;
- the time it was applied and its duration; and
- the application version, when available.

The checksum protects migration history. If an applied migration is edited,
startup and `db:migrate` stop with a checksum mismatch instead of silently
changing an existing database.

Application startup performs these steps:

1. Connect to the configured SurrealDB instance.
2. Create the configured namespace and database if needed.
3. Apply pending migrations.
4. Run the legacy model `up()` functions and seeders.

The model bootstrap remains for compatibility while schema ownership is moved
to migrations. New durable schema changes should be migrations. Do not add new
versioned behavior to `scripts/syncDB.ts`; `db:schema:sync` is a legacy escape
hatch, not a substitute for migration history.

## Setting up another machine

For a fresh development database:

```sh
git checkout <branch-or-release>
bun install
cp .env.example .env
# Configure DB_PROTOCOL, DB_HOST, DB_PORT, DB_NAMESPACE,
# DB_DATABASE, DB_USER, and DB_PASSWORD.
bun run db:up
bun run db:migration:status
bun run db:migrate
bun run db:migration:status
```

Starting the application also applies pending migrations, but running the
commands explicitly makes failures easier to diagnose before the server and
seeders start.

For an existing database moved to another machine:

1. Back up or export the database before changing code or schema.
2. Restore the database using the SurrealDB version used by the source system.
3. Check out the exact application branch or release that will operate on it.
4. Configure `.env` locally. Do not copy secrets into source control.
5. Run `bun run db:migration:status`.
6. Resolve any connection or checksum error before applying changes.
7. Run `bun run db:migrate`, then verify status again.

The database volume is not carried by Git. Moving the repository and moving the
database are separate operations.

To inspect the ledger in Surrealist:

```sql
SELECT
  migrationId,
  description,
  appliedAt,
  durationMs,
  appVersion
FROM schema_migration
ORDER BY migrationId ASC;
```

## Authoring a migration

Use a UTC timestamp followed by a short snake-case description:

```text
YYYYMMDDHHMMSS_description.ts
```

Implement the shared `Migration` type:

```ts
import type { Migration } from "./types";

export const migration: Migration = {
  id: "20260730183000_add_example_field",
  description: "Add an optional example field to ideas.",
  async up(db) {
    await db.query(`
      DEFINE FIELD IF NOT EXISTS example
        ON TABLE idea
        TYPE option<string>;
    `);
  },
  async down(db) {
    await db.query(`
      REMOVE FIELD example ON TABLE idea;
    `);
  },
};
```

Import the migration in `app/database/migrations/index.ts` and append it to the
registry. The registry sort handles ordering, but keeping imports and entries
chronological makes reviews easier.

Before handing off:

```sh
bun run db:migration:status
bun run db:migrate
bun run db:migration:status
bun run typecheck
bun run test
```

When the rollback is safe on disposable data, also run it and reapply:

```sh
bun run db:rollback
bun run db:migrate
```

## Migration invariants

Humans and agents modifying migrations must follow these rules:

1. Treat an applied migration as immutable. Add a corrective migration instead
   of editing its ID, description, `up`, or `down` implementation.
2. Keep migration IDs unique and monotonically increasing.
3. Implement a meaningful `down` function unless reversal is intrinsically
   unsafe. If it is unsafe, throw an explicit error and document the recovery
   procedure.
4. Make `up` and `down` operate only on the schema or data named by the
   migration.
5. Use structured SurrealQL and parameter binding for data values.
6. Back up production data before destructive or data-rewriting migrations.
7. Prefer rollout-compatible sequences: add, deploy compatible code, backfill,
   then remove obsolete structures in a later release.
8. Never repair a checksum mismatch by manually changing the ledger unless the
   database history has been independently audited and the recovery is
   documented.

## Rollback behavior and limitations

`db:rollback` rolls back the most recently applied migration by default.
`--steps N` rolls back the latest `N` records in reverse application order.

The initial migration creates the migration ledger and deliberately cannot be
rolled back automatically. Removing the ledger would erase the system's
knowledge of what has already run.

A migration is recorded only after its `up` function succeeds. SurrealDB DDL
inside a migration is not automatically wrapped in one cross-query
transaction, so a failed multi-query migration may leave partial changes
without a ledger record. Inspect the schema, repair with an explicit migration
or a carefully reviewed manual operation, and then rerun.

The runner currently assumes one linear migration history. It does not support
branches, dependencies, or concurrent migration workers. Run migrations from a
single deployment process before starting additional application instances.
