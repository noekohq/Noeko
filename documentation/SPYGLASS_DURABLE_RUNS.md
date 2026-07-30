# Durable Spyglass Runs

Deep Focus runs are server-owned jobs. Creating a run returns immediately; closing the browser only
disconnects that browser from progress events and does not stop the analysis.

Glimpse continues to use the legacy request-bound stream for now.

## Data model

`spyglass_run` is the durable snapshot:

- owner, query, profile, and per-run configuration
- queued/running/completed/failed/cancelled lifecycle
- current phase and accumulated intent, resources, findings, and overview
- cancellation request, attempt count, and worker lease
- monotonic `lastEventSequence`

`spyglass_run_event` is the append-only replay log. Events have a run ID and sequence number, with a
unique index enforcing one event per sequence. The event append function lives beside the run model
in `app/database/models/spyglass_run_schema.ts` so its transactional behavior stays easy to compare
with its caller.

A restarted run appends a `reset` event before producing new output. This preserves the audit trail
while telling replay clients to discard partial output from the abandoned attempt.

## Lifecycle

1. `POST /api/search/spyglass/runs` validates access, persists a queued run, and dispatches it.
2. An in-process worker conditionally claims the run and renews a time-bounded lease.
3. Every analysis event updates the snapshot and is appended to the event log.
4. `GET /api/search/spyglass/runs/:id/events?after=N` replays events after a cursor and waits for new
   events until the run reaches a terminal state.
5. A disconnected client can reopen `/spyglass?run=spyglass_run:...` and replay the same run.
6. `POST /api/search/spyglass/runs/:id/cancel` requests cooperative cancellation.
7. On startup, workers discover queued runs and running runs with expired leases.

The browser is a projection of persisted state. It is not responsible for saving Deep Focus output.

## API surface

- `POST /api/search/spyglass/runs`
- `GET /api/search/spyglass/runs`
- `GET /api/search/spyglass/runs/:id`
- `GET /api/search/spyglass/runs/:id/events?after=N`
- `POST /api/search/spyglass/runs/:id/cancel`

Legacy history includes durable runs so active, failed, cancelled, and completed work is visible in
one place.

## SurrealDB v3 direction

The schema uses explicit fields and indexes for lifecycle invariants while leaving configuration
and event payloads flexible. This keeps run profiles extensible and limits the v3 upgrade surface to
migration syntax and the small model boundary.

Polling the persisted event log is intentional for the first milestone. SurrealDB live queries can
later reduce latency, but the event table remains the source of replay and recovery truth.

Workers currently run alongside the API server. Leasing allows the same worker implementation to be
moved into separate processes without changing the public run contract.

## Current boundaries

- Cancellation is cooperative between generator events; an individual provider request is not yet
  preempted.
- Glimpse still uses the legacy stream and client-side save endpoint.
- A future profile resolver should map simple UI choices such as Deep Focus onto the generic
  configuration object.
- Rabbithole, tag, and date constraints are persisted as part of each run configuration and are
  passed to the current analysis implementation.
