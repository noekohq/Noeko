# SurrealDB v3 production-data rehearsal — 2026-08-04

This log records the first local rehearsal of Noeko's production SurrealDB v2
data migration to SurrealDB v3. It complements the production runbook in
`docs/operations/surrealdb-v3-upgrade.md`.

Do not commit database exports. They contain production data, authentication
artifacts, and private user content.

## Inputs

- Production host: `Onyx` (`/var/www/qwest-prod`)
- Source export: `db_backup_20260804214257.surql`
- Source export size: approximately 144 MiB
- SHA-256: `f8cf8c65d7d4718cf5787e02f890321899b961d11b08edb1deab3fb33751535c`
- The checksum matched before and after SCP.
- Local export permissions: owner read/write only (`0600`)
- Source database version: SurrealDB v2 (ordinary v2 logical export)
- Conversion server: SurrealDB `2.6.5`
- Target server: SurrealDB `3.2.3`
- JavaScript SDK target: `2.0.8`

## Local replacement scope

The user explicitly authorized replacing all local Noeko database data. The
rehearsal targets only these named Docker volumes:

- `noeko_surrealdb_data`
- `noeko_surrealdb_data_v3`

The separate `noeko-test_surrealdb_data` volume is not part of the rehearsal.

## Rehearsal log

### Capture and transfer

The legacy production export script initially failed because it contained a
retired hard-coded log path, parsed dotenv with `grep | xargs`, and invoked the
legacy standalone `docker-compose` client. The replacement script uses a
project-relative path, Bun's dotenv parser, and the Compose plugin command
`docker compose`.

The corrected production export completed at 2026-08-04 21:43 server time and
was copied to the ignored local `temp_backups/production-rehearsal/` directory.

### Restore to v2.6.5

The ordinary production export could not be restored to a clean v2.6.5
instance. HTTP import failed after approximately 7 seconds with a response-body
decoding error. A clean retry over WebSocket confirmed that the v2 backup API
is HTTP-only.

Validation with the v2.6.5 parser found the actual cause at line 476: an invalid
`\\0` escape inside stored content. This is an export correctness defect in the
production v2.6.0 server, not transfer corruption. The failed local volume was
discarded before further work.

### v3-compatible export and validation

Production was confirmed to be running SurrealDB `2.6.0`. The official
SurrealDB 3 `v2 export --v3` wrapper was run read-only beside the production
container using its v2.6.5 compatibility binary. Initial image pulls aside, the
export itself completed in approximately 14 seconds without stopping
production.

The converted file was 144 MiB and transferred with matching SHA-256:

`d3d2c304f3f1883f15965358411197cbf19c4285cdfc7b44aa04b48fda2711f3`

Target v3.2.3 validation still failed because the production v2.6.0 server had
already emitted a corrupt stored-functions section: function definitions were
concatenated and return expressions were malformed. The compatibility client
cannot repair schema text already corrupted by the source server.

Next attempt: create a v3-compatible export with stored functions excluded,
then allow the version-controlled application schema bootstrap to recreate
them. This remains read-only and requires no production downtime. If any other
section remains malformed, a stopped production volume snapshot or a brief
v2.6.5 production patch window will be required.

The no-functions export also failed target validation because v2.6.0 emitted
concatenated analyzer definitions without statement delimiters. A subsequent
tables-and-records-only export proved the defect is not limited to global
schema: record IDs were serialized without their keys (for example,
`connected:` and `idea:`). A records-only selection without tables produced an
empty export, as the v2 exporter requires tables to be selected before their
records.

Conclusion: production v2.6.0 cannot produce a trustworthy restorable logical
export for this dataset, even when driven by the v2.6.5 compatibility client.
Do not patch the malformed files or use them for restore.

The required next step is a short production maintenance window to obtain a
consistent stopped-volume archive while leaving production on v2.6.0. Restore
that raw archive only into a disposable local v2 volume, open the copy with
v2.6.5, apply the compatibility preflight, and generate the v3 export locally.
An alternative is a controlled production patch restart to v2.6.5 followed by
a fresh export, but that changes the production server and has a larger risk
surface than the stopped-volume snapshot.

### Stopped-volume capture

The production datastore was resolved explicitly before shutdown:

- Docker volume: `qwest-prod_surrealdb_data`
- Host mount: `/var/lib/docker/volumes/qwest-prod_surrealdb_data/_data`
- Data size: approximately 1.4 GiB
- Host free space before capture: 126 GiB

All containers mounting the volume were confirmed stopped. Creating an
uncompressed archive from the read-only volume took **5.370 seconds**:

`migration_backups/surrealdb-v2-production-2026-08-04.tar`

Production restarted on SurrealDB `2.6.0`; `surreal is-ready` returned `OK`.
The production backend is managed by Supervisor as `noeko-prod`, not by the
Compose `app` service. `supervisorctl restart noeko-prod` restored the backend,
which completed database initialization plus Search, Analysis, Insights, and
Graph service initialization and listened on port 3011.

The 1.3 GiB tar was compressed after production had restarted. Fast gzip
compression took **21.847 seconds** and produced a 458 MiB artifact. The
compressed SHA-256 matched on Onyx and the local workstation:

`54499cb3beaa4d3e24c4046f5d885b5b1496e0caed19696db372c9529016ed2a`

### Import to v3.2.3

The stopped-volume archive restored into `noeko_surrealdb_data` in 15.3
seconds, including the one-time local Alpine image pull. The x86_64 production
RocksDB store opened cleanly under local arm64 SurrealDB 2.6.5 with no recovery
or storage compatibility errors. Authentication was disabled only for this
localhost-bound conversion instance so production root credentials did not
need to be copied to the workstation.

The production data was located at namespace `qwest`, database `qwest-prod`.
After applying the reviewed schema preflight to the disposable copy, v2.6.5
created a 145 MiB v3-compatible export in **7.0 seconds**.

- Export: `production-stopped-volume-v3-20260804.surql`
- SHA-256: `3d2e6acb3b45a91f776af7c62617e3f8749e18d673389a4cab6ccfc467978a15`
- SurrealDB 3.2.3 validation: `OK`

Import into a fresh `noeko_surrealdb_data_v3` volume completed with no errors in
**18.2 seconds**. The production export was imported into the workstation's
configured `twig` / `twig` namespace and database so the normal local app can
use it without environment changes. The v2 conversion volume was retained for
comparison.

### Verification

The pre-conversion v2 baseline contains 39 tables. Selected counts:

- users: 85
- ideas: 2,715
- tags: 317
- tasks: 293
- user tokens: 930
- ownership relations: 3,900
- connection relations: 875
- schema migrations: 4

The complete per-table baseline was captured programmatically for the final v3
comparison.

The immediate post-import v3 count capture matched all 39 original production
tables exactly. Application startup then:

1. Applied the pending `20260804130000_add_organizations` migration once.
2. Completed model bootstrap and role/feature seeding.
3. Initialized Search, Analysis, Insights, and Graph successfully.
4. Returned a successful `/api/healthcheck` response.

The final post-startup comparison still matched every original production
table. Expected additions were four empty organization tables (`organization`,
`member_of`, `access_grant`, and `organization_audit_event`), and the migration
ledger increased from 4 to 5 records. TypeScript typechecking passed.

The local password for `aidantilgner02@gmail.com` was reset using the repaired
CLI. The generated password is intentionally not stored in this runbook.

The first real login exposed one additional SDK/schema incompatibility:
`user_token.createdAt` and `expiresAt` were defined as strings even though the
TypeScript model has always represented them as `Date`. SDK 2 serializes these
as native SurrealDB datetimes, so token creation was rejected. Migration
`20260804223500_fix_user_token_datetimes` now converts all existing token ISO
strings with `type::datetime()` and defines both fields as `datetime`.

All 930 imported token records were verified to contain native datetimes after
the migration. A real local login then returned HTTP 200 and successfully
created the access/refresh token pair.

## Production implications

- A logical export from production v2.6.0 is not a sufficient backup for this
  migration; parser validation must be mandatory.
- The rehearsal requires one brief stopped-volume capture before the final
  upgrade window can be estimated accurately. This capture showed the raw tar
  itself requires only about 5.4 seconds for the current 1.4 GiB volume.
- The final changeover should first move the stopped production volume copy to
  v2.6.5 or run v2.6.5 on the retained original during maintenance, then export
  with `--v3` and validate before starting v3.
- Preserve the original v2 volume and never open it with a v3 server.
- Production operations must account for Supervisor ownership of `noeko-prod`;
  Compose alone does not stop or restart the backend process.
- For the measured dataset, the critical-path timings were approximately 5.4
  seconds for stopped-volume capture, 7.0 seconds for v3 export from v2.6.5,
  and 18.2 seconds for v3 import. Compression and transfer can occur after
  production is restored and do not belong in the maintenance critical path.
