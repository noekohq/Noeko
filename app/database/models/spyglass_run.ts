import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import type {
  CreateSpyglassRunInput,
  SpyglassRun,
  SpyglassRunEvent,
  SpyglassRunEventType,
  SpyglassRunPhase,
} from "../../../shared/types/spyglass-run";

type AnyRecordId = RecordId | StringRecordId;
type SpyglassRunCreator = Omit<SpyglassRun, "id">;

const toRecordId = (id: string | AnyRecordId) =>
  typeof id === "string" ? new StringRecordId(id) : id;

const withWriteConflictRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isWriteConflict =
        message.includes("read or write conflict") ||
        message.includes("Transaction conflict") ||
        message.includes("Resource busy");
      if (!isWriteConflict || attempt === 10) throw error;

      // SurrealDB v3 reports write contention as "Transaction conflict:
      // Resource busy". Durable Spyglass runs can append many findings at once,
      // so use a bounded exponential backoff before giving up on a transient
      // conflict.
      const delay = Math.min(25 * 2 ** (attempt - 1), 500);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

export class SpyglassRunModel {
  static readonly table = "spyglass_run";
  static readonly eventTable = "spyglass_run_event";

  static async create(input: CreateSpyglassRunInput): Promise<SpyglassRun> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");

    const now = new Date();
    const profile = input.profile ?? "deep_focus";
    const [run] = await db.create<SpyglassRun, SpyglassRunCreator>(this.table, {
      userId: new StringRecordId(input.userId),
      query: input.query,
      profile,
      configuration: input.configuration,
      status: "queued",
      phase: "queued",
      cancellationRequested: false,
      attempt: 0,
      lastEventSequence: 0,
      overview: "",
      findings: [],
      resources: [],
      fullResults: [],
      createdAt: now,
      updatedAt: now,
    });
    if (!run) throw new Error("Failed to create Spyglass run");

    await db.query(`RELATE $userId->owns->$runId CONTENT { createdAt: $createdAt };`, {
      userId: new StringRecordId(input.userId),
      runId: run.id,
      createdAt: now,
    });
    await this.appendEvent(
      run.id,
      "status",
      profile === "deep_focus" ? "Queued for Deep Focus analysis." : "Queued for Glimpse analysis."
    );
    return (await this.getById(run.id)) ?? run;
  }

  static async getById(id: string | AnyRecordId): Promise<SpyglassRun | null> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[SpyglassRun[]]>(
      `SELECT * FROM ${this.table} WHERE id = $id LIMIT 1;`,
      { id: toRecordId(id) }
    );
    return rows[0] ?? null;
  }

  static async getOwnedById(
    id: string | AnyRecordId,
    userId: string | AnyRecordId
  ): Promise<SpyglassRun | null> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[SpyglassRun[]]>(
      `SELECT * FROM ${this.table} WHERE id = $id AND userId = $userId LIMIT 1;`,
      { id: toRecordId(id), userId: toRecordId(userId) }
    );
    return rows[0] ?? null;
  }

  static async listForUser(
    userId: string | AnyRecordId,
    page: number,
    pageSize: number
  ): Promise<{ runs: SpyglassRun[]; total: number; page: number; limit: number }> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const offset = Math.max(0, page - 1) * pageSize;
    const [runs = [], totals = []] = await db.query<[SpyglassRun[], { total: number }[]]>(
      `SELECT * FROM ${this.table}
       WHERE userId = $userId
       ORDER BY createdAt DESC LIMIT $limit START $offset;
       SELECT count() AS total FROM ${this.table} WHERE userId = $userId GROUP ALL;`,
      { userId: toRecordId(userId), limit: pageSize, offset }
    );
    return { runs, total: totals[0]?.total ?? 0, page, limit: pageSize };
  }

  static async appendEvent(
    runId: string | AnyRecordId,
    type: SpyglassRunEventType,
    data: unknown
  ): Promise<number> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const result = await withWriteConflictRetry(() =>
      db.run<number>("fn::append_spyglass_run_event", [toRecordId(runId), type, data])
    );
    return result;
  }

  static async getEventsAfter(
    runId: string | AnyRecordId,
    sequence: number
  ): Promise<SpyglassRunEvent[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [events = []] = await db.query<[SpyglassRunEvent[]]>(
      `SELECT * FROM ${this.eventTable}
       WHERE runId = $runId AND sequence > $sequence
       ORDER BY sequence ASC;`,
      { runId: toRecordId(runId), sequence }
    );
    return events;
  }

  static async claim(
    runId: string | AnyRecordId,
    workerId: string,
    leaseUntil: Date
  ): Promise<SpyglassRun | null> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await withWriteConflictRetry(() =>
      db.query<[SpyglassRun[]]>(
        `UPDATE $runId SET
         status = "running",
         phase = "starting",
         leaseOwner = $workerId,
         leaseExpiresAt = $leaseUntil,
         startedAt = startedAt ?? time::now(),
         updatedAt = time::now(),
         attempt += 1
       WHERE status = "queued"
          OR (status = "running" AND leaseExpiresAt < time::now())
       RETURN AFTER;`,
        { runId: toRecordId(runId), workerId, leaseUntil }
      )
    );
    return rows[0] ?? null;
  }

  static async renewLease(
    runId: string | AnyRecordId,
    workerId: string,
    leaseUntil: Date
  ): Promise<boolean> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await withWriteConflictRetry(() =>
      db.query<[SpyglassRun[]]>(
        `UPDATE $runId SET leaseExpiresAt = $leaseUntil, updatedAt = time::now()
       WHERE status = "running" AND leaseOwner = $workerId RETURN AFTER;`,
        { runId: toRecordId(runId), workerId, leaseUntil }
      )
    );
    return rows.length === 1;
  }

  static async applyEvent(
    runId: string | AnyRecordId,
    type: SpyglassRunEventType,
    data: unknown
  ): Promise<void> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const id = toRecordId(runId);
    const now = new Date();

    if (type === "reset") {
      await withWriteConflictRetry(() =>
        db.query(
          `UPDATE $id SET
           intent = NONE,
           resources = [],
           fullResults = [],
           findings = [],
           overview = "",
           phase = "starting",
           updatedAt = $now;`,
          { id, now }
        )
      );
    } else if (type === "intent_loaded") {
      await withWriteConflictRetry(() =>
        db.query(`UPDATE $id SET intent = $data, phase = "intent", updatedAt = $now;`, {
          id,
          data,
          now,
        })
      );
    } else if (type === "resources_loaded") {
      await withWriteConflictRetry(() =>
        db.query(`UPDATE $id SET resources = $data, phase = "retrieval", updatedAt = $now;`, {
          id,
          data,
          now,
        })
      );
    } else if (type === "full_results_loaded") {
      await withWriteConflictRetry(() =>
        db.query(`UPDATE $id SET fullResults = $data, updatedAt = $now;`, { id, data, now })
      );
    } else if (type === "findings_chunk") {
      await withWriteConflictRetry(() =>
        db.query(
          `UPDATE $id SET findings = array::concat(findings, $data), phase = "findings", updatedAt = $now;`,
          { id, data, now }
        )
      );
    } else if (type === "overview_chunk" || type === "glimpse_chunk") {
      await withWriteConflictRetry(() =>
        db.query(
          `UPDATE $id SET overview = string::concat(overview, $data), phase = "overview", updatedAt = $now;`,
          { id, data, now }
        )
      );
    }
  }

  static async requestCancellation(
    runId: string | AnyRecordId,
    userId: string | AnyRecordId
  ): Promise<SpyglassRun | null> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await withWriteConflictRetry(() =>
      db.query<[SpyglassRun[]]>(
        `UPDATE $runId SET cancellationRequested = true, updatedAt = time::now()
       WHERE userId = $userId AND status IN ["queued", "running"] RETURN AFTER;`,
        { runId: toRecordId(runId), userId: toRecordId(userId) }
      )
    );
    return rows[0] ?? null;
  }

  static async isCancellationRequested(runId: string | AnyRecordId): Promise<boolean> {
    return (await this.getById(runId))?.cancellationRequested ?? false;
  }

  static async finish(
    runId: string | AnyRecordId,
    status: "completed" | "failed" | "cancelled",
    error?: string
  ): Promise<void> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const timestampField: Record<typeof status, string> = {
      completed: "completedAt",
      failed: "failedAt",
      cancelled: "cancelledAt",
    };
    await withWriteConflictRetry(() =>
      db.query(
        `UPDATE $runId SET
         status = $status,
         phase = $status,
         error = $error,
         ${timestampField[status]} = time::now(),
         leaseOwner = NONE,
         leaseExpiresAt = NONE,
         updatedAt = time::now();`,
        { runId: toRecordId(runId), status, error }
      )
    );
  }

  static async findClaimable(limit = 10): Promise<SpyglassRun[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[SpyglassRun[]]>(
      `SELECT * FROM ${this.table}
       WHERE status = "queued"
          OR (status = "running" AND leaseExpiresAt < time::now())
       ORDER BY createdAt ASC LIMIT $limit;`,
      { limit }
    );
    return rows;
  }

  static phaseForEvent(type: SpyglassRunEventType): SpyglassRunPhase | undefined {
    if (type === "intent_loaded") return "intent";
    if (type === "resources_loaded" || type === "full_results_loaded") return "retrieval";
    if (type === "findings_chunk") return "findings";
    if (type === "overview_chunk" || type === "glimpse_chunk") return "overview";
    return undefined;
  }
}
