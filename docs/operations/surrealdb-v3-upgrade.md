# SurrealDB 2.6 to 3.2 production upgrade

This runbook upgrades Noeko's single-node RocksDB deployment on Ubuntu with Docker Compose. It uses a logical export/import into a new volume. Do not point SurrealDB 3 at the v2 RocksDB directory, and do not point SurrealDB 2 at the v3 directory.

The repository pins:

- SurrealDB server `3.2.3`
- JavaScript SDK `2.0.8`
- A new Compose volume, `surrealdb_data_v3`
- The explicit v3 datastore URI `rocksdb:///data/database.db`

`3.2.3` is intentional. At the time of this change, `3.2.4` is the newest server patch, but the official JavaScript SDK compatibility table only guarantees SDK `2.0.8` through server `3.2.3`. Re-evaluate both pins together before changing either one.

Official references:

- [SurrealDB 2.x to 3.x migration guide](https://surrealdb.com/docs/build/migrating/from-old-surrealdb-versions/2x-to-3x)
- [SurrealDB import command](https://surrealdb.com/docs/reference/cli/surrealdb-cli/commands/import)
- [Self-hosted upgrades and patching](https://surrealdb.com/docs/manage/self-hosted/upgrades-and-patching)
- [JavaScript SDK compatibility](https://surrealdb.com/docs/reference/javascript)

## Expected downtime and rollback boundary

Use a maintenance window. Stop application writes before the export and do not reopen traffic until validation is complete. A rollback to v2 restores the state at export time; writes accepted only by v3 are not automatically convertible back to v2.

The 2026-08-04 rehearsal used a stopped copy of the real Onyx production
volume. Measured database timings for the current 1.4 GiB datastore were:

- stopped-volume tar: 5.37 seconds;
- v3-compatible export from v2.6.5: 7.0 seconds;
- import into v3.2.3: 18.2 seconds.

Reserve a 30-minute maintenance window even though database work measured
under one minute. Application release switching, health checks, login, and the
go/no-go decision dominate the window.

Onyx-specific facts established by the rehearsal:

- production namespace/database: `qwest` / `qwest-prod`;
- v2 volume: `qwest-prod_surrealdb_data`;
- the backend is managed by Supervisor as `noeko-prod`, not by Compose;
- production SurrealDB 2.6.0 emits corrupt logical exports for this dataset;
- the server itself must run v2.6.5 before creating the `--v3` export.

Keep all of these until the migration has passed its retention window:

1. The original v2 named volume.
2. A stopped-volume archive.
3. The v3-compatible logical export and its SHA-256 file.
4. The old application image or Git revision, which uses the v1 SDK and v2 SurrealQL.

## 1. Preflight

Run from the production repository directory. Commands below assume the normal production files are `docker-compose.yml` and `docker-compose.prod.yml`.

```bash
git status --short
docker version
docker compose version
df -h
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T surrealdb /surreal version
```

Confirm the current database is v2 and record the actual volume name:

```bash
DB_CONTAINER="$(docker compose -f docker-compose.yml -f docker-compose.prod.yml ps -q surrealdb)"
docker inspect "$DB_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/data"}}volume={{.Name}} source={{.Source}}{{end}}{{end}}'
```

On Onyx, the expected result is `qwest-prod_surrealdb_data`. Resolve it again
at cutover rather than relying only on the documented name.

Do not paste the output of an expanded `docker compose config` into tickets or chat. It can include values from `.env`.

Set `DB_PROTOCOL=ws` for the long-lived Noeko backend. `http`/`https` also work after this upgrade; the application automatically appends the SDK 2 `/rpc` path.

## 2. Stage code without restarting the app

Build the release in a staging/release directory so the running Supervisor
process and its served `dist` directory remain unchanged. Do not restart
`noeko-prod` yet:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run build
```

Confirm `.env` has `DB_PROTOCOL=ws`. Pull `alpine:3.22`, SurrealDB `2.6.5`, and
SurrealDB `3.2.3` before maintenance. The rehearsal already pulled these images
on Onyx, but verify they remain present.

## 3. Make recoverable v2 backups

First stop Supervisor so no backend process can write, then stop v2 and archive
the exact named volume resolved during preflight. On Onyx the expected volume
is `qwest-prod_surrealdb_data`.

```bash
mkdir -p migration_backups
supervisorctl stop noeko-prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop surrealdb
docker ps --filter "volume=qwest-prod_surrealdb_data" \
  --format 'container={{.Names}} status={{.Status}}'

# The docker ps command above must print nothing.
docker run --rm \
  -v qwest-prod_surrealdb_data:/source:ro \
  -v "$PWD/migration_backups:/backup" \
  alpine:3.22 \
  tar -C /source -cf /backup/surrealdb-v2-volume.tar .
sha256sum migration_backups/surrealdb-v2-volume.tar \
  > migration_backups/surrealdb-v2-volume.tar.sha256
```

Do not use a logical export from the original v2.6.0 server as the backup. The
rehearsal demonstrated invalid escapes, concatenated schema definitions, and
record IDs missing their keys. The stopped-volume archive is the rollback
artifact.

Start the original volume on the final v2 patch using the migration-only override:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.surreal-v2-export.yml \
  up -d --force-recreate surrealdb

docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.surreal-v2-export.yml \
  exec -T surrealdb /surreal is-ready --endpoint http://127.0.0.1:8000
```

SurrealDB `2.6.5` is required here. Confirm `/surreal version` reports 2.6.5
before applying preflight or exporting. Earlier 2.6 releases had export
correctness bugs, and production 2.6.0 was proven unusable for this dataset.

If available, connect Surrealist to this v2.6.5 instance and run its Migration diagnostics. Resolve every “will break” item before continuing.

Apply Noeko's known schema preflight fixes:

```bash
set -a
source .env
set +a

docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.surreal-v2-export.yml \
  exec -T surrealdb /surreal sql \
    --endpoint http://127.0.0.1:8000 \
    --user "$DB_USER" \
    --pass "$DB_PASSWORD" \
    --namespace "$DB_NAMESPACE" \
    --database "$DB_DATABASE" \
    --hide-welcome \
  < scripts/surreal-v3-preflight.surql
```

Create a v3-compatible logical export:

```bash
mkdir -p temp_backups

docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.surreal-v2-export.yml \
  exec -T surrealdb /surreal export --v3 \
    --endpoint http://127.0.0.1:8000 \
    --user "$DB_USER" \
    --pass "$DB_PASSWORD" \
    --namespace "$DB_NAMESPACE" \
    --database "$DB_DATABASE" \
    /transfers/production-v2-for-v3.surql

sha256sum temp_backups/production-v2-for-v3.surql \
  | tee migration_backups/production-v2-for-v3.surql.sha256
cp temp_backups/production-v2-for-v3.surql migration_backups/
```

Validate the export with the exact target parser:

```bash
docker run --rm \
  -v "$PWD/migration_backups:/transfers:ro" \
  surrealdb/surrealdb:v3.2.3 \
  validate /transfers/production-v2-for-v3.surql
```

Do not continue unless validation prints `OK`.

## 4. Capture v2 verification data

At minimum record counts for business-critical tables. Save the output with the migration artifacts.

```bash
COUNT_QUERY='RETURN {
  idea: count((SELECT VALUE id FROM idea)),
  tag: count((SELECT VALUE id FROM tag)),
  task: count((SELECT VALUE id FROM task)),
  user: count((SELECT VALUE id FROM user)),
  owns: count((SELECT VALUE id FROM owns)),
  connected: count((SELECT VALUE id FROM connected)),
  describes: count((SELECT VALUE id FROM describes)),
  spyglass_run: count((SELECT VALUE id FROM spyglass_run)),
  spyglass_run_event: count((SELECT VALUE id FROM spyglass_run_event)),
  schema_migration: count((SELECT VALUE id FROM schema_migration))
};'

printf '%s\n' "$COUNT_QUERY" | docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.surreal-v2-export.yml \
  exec -T surrealdb /surreal sql \
    --endpoint http://127.0.0.1:8000 \
    --user "$DB_USER" \
    --pass "$DB_PASSWORD" \
    --namespace "$DB_NAMESPACE" \
    --database "$DB_DATABASE" \
    --hide-welcome --json \
  | tee migration_backups/v2-counts.json
```

## 5. Start v3 on its new volume

Stop and remove only the v2 service container. Do not run `docker compose down -v` and do not remove the v2 volume.

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.surreal-v2-export.yml \
  stop surrealdb

docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  rm -f surrealdb

docker compose -f docker-compose.yml -f docker-compose.prod.yml pull surrealdb
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d surrealdb
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps surrealdb
```

The updated base Compose file creates `surrealdb_data_v3`. Confirm `/version` reports `3.2.3` and readiness succeeds:

```bash
curl --fail http://127.0.0.1:"$DB_PORT"/version
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec -T surrealdb /surreal is-ready --endpoint http://127.0.0.1:8000
```

## 6. Import

```bash
set -a
source .env
set +a

docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  exec -T surrealdb /surreal import \
    --endpoint http://127.0.0.1:8000 \
    --user "$DB_USER" \
    --pass "$DB_PASSWORD" \
    --namespace "$DB_NAMESPACE" \
    --database "$DB_DATABASE" \
    /transfers/production-v2-for-v3.surql
```

The expected result is `Import executed with no errors`. If import fails, treat the v3 volume as partial: stop v3, remove only the new v3 container and volume, recreate it, and retry after fixing the source schema/export. Never retry into a partially imported database.

## 7. Verify and release traffic

Run the count query from step 4 against the normal v3 Compose files and compare every value with `v2-counts.json`. Also verify:

```bash
bun run typecheck
bun run db:migrate
bun run db:migration:status

supervisorctl start noeko-prod
supervisorctl status noeko-prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=200 surrealdb
tail -n 200 /var/log/qwest.out.log
curl --fail http://127.0.0.1:"$PORT"/api/healthcheck
```

Application startup must complete all of these without errors:

- Database migrations are up to date.
- Role and feature seeding completes.
- Search service initializes its full-text and HNSW indexes.
- Analysis, Insights, and Graph services initialize.
- A real login succeeds.
- `/constellation` loads for an existing account.
- Create, edit, connect, search, and delete smoke checks succeed.

Keep traffic disabled if any count differs or a critical startup/smoke check fails.

The imported migration ledger should advance from 4 to 6 as the organizations
and user-token datetime migrations run. The token migration must report all
legacy token timestamps as native datetimes; a real login verifies refresh
token creation under SDK 2.

## 8. Rollback

Rollback is safe only while the v2 volume and old application release are retained.

1. Stop the app and v3 database.
2. Deploy the old application revision.
3. Start SurrealDB `2.6.5` with `docker-compose.surreal-v2-export.yml`, which remounts `surrealdb_data` rather than `surrealdb_data_v3`.
4. Verify the saved v2 counts and old application health.
5. Reopen traffic.

```bash
supervisorctl stop noeko-prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop surrealdb

# After checking out/deploying the old application revision:
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.surreal-v2-export.yml \
  up -d surrealdb

supervisorctl start noeko-prod
```

If the v2 volume itself is unavailable, create a new empty v2 volume and restore the stopped-volume archive into it. Never extract an archive over a non-empty running database volume.

## 9. After the retention window

Only after production validation and the agreed rollback window:

- Move the logical export and volume archive to durable encrypted backup storage.
- Test a restore in a non-production environment.
- Remove expired local migration artifacts.
- Remove the old v2 Docker volume only after its exact name has been reviewed.
- Keep server and SDK pins explicit; do not change the E2E image back to a floating major tag.
