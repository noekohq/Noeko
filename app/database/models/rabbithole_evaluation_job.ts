import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";

type AnyRecordId = RecordId | StringRecordId;

export type RabbitholeEvaluationJob = {
  id: RecordId;
  thingId: RecordId;
  status: "queued" | "running" | "failed";
  attempt: number;
  availableAt: Date;
  createdAt: Date;
  updatedAt: Date;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
  error?: string;
};

const toRecordId = (id: string | AnyRecordId) =>
  typeof id === "string" ? new StringRecordId(id) : id;

export class RabbitholeEvaluationJobModel {
  static readonly table = "rabbithole_evaluation_job";

  static async enqueue(thingId: string | AnyRecordId): Promise<RabbitholeEvaluationJob> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const now = new Date();
    const [job] = await db.create<RabbitholeEvaluationJob, Omit<RabbitholeEvaluationJob, "id">>(
      this.table,
      {
        thingId: toRecordId(thingId) as RecordId,
        status: "queued",
        attempt: 0,
        availableAt: now,
        createdAt: now,
        updatedAt: now,
      }
    );
    if (!job) throw new Error(`Unable to enqueue Rabbithole evaluation for ${thingId}`);
    return job;
  }

  static async findClaimable(limit = 25): Promise<RabbitholeEvaluationJob[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [jobs = []] = await db.query<[RabbitholeEvaluationJob[]]>(
      `SELECT * FROM ${this.table}
       WHERE (status = "queued" AND availableAt <= time::now())
          OR (status = "running" AND leaseExpiresAt < time::now())
       ORDER BY createdAt ASC LIMIT $limit;`,
      { limit }
    );
    return jobs;
  }

  static async claim(
    jobId: string | AnyRecordId,
    workerId: string,
    leaseUntil: Date,
    maxAttempts: number
  ): Promise<RabbitholeEvaluationJob | null> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [jobs = []] = await db.query<[RabbitholeEvaluationJob[]]>(
      `UPDATE $jobId SET
         status = "running",
         leaseOwner = $workerId,
         leaseExpiresAt = $leaseUntil,
         attempt += 1,
         updatedAt = time::now()
       WHERE attempt < $maxAttempts AND (
         (status = "queued" AND availableAt <= time::now())
         OR (status = "running" AND leaseExpiresAt < time::now())
       )
       RETURN AFTER;`,
      { jobId: toRecordId(jobId), workerId, leaseUntil, maxAttempts }
    );
    return jobs[0] ?? null;
  }

  static async renewLease(
    jobId: string | AnyRecordId,
    workerId: string,
    leaseUntil: Date
  ): Promise<void> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    await db.query(
      `UPDATE $jobId SET leaseExpiresAt = $leaseUntil, updatedAt = time::now()
       WHERE status = "running" AND leaseOwner = $workerId;`,
      { jobId: toRecordId(jobId), workerId, leaseUntil }
    );
  }

  static async complete(jobId: string | AnyRecordId, workerId: string): Promise<void> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    await db.query(`DELETE $jobId WHERE status = "running" AND leaseOwner = $workerId;`, {
      jobId: toRecordId(jobId),
      workerId,
    });
  }

  static async retryOrFail(
    job: RabbitholeEvaluationJob,
    workerId: string,
    error: string,
    maxAttempts: number
  ): Promise<void> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const exhausted = job.attempt >= maxAttempts;
    const delayMs = Math.min(60_000, 1_000 * 2 ** Math.max(0, job.attempt - 1));
    await db.query(
      `UPDATE $jobId SET
         status = $status,
         availableAt = $availableAt,
         error = $error,
         leaseOwner = NONE,
         leaseExpiresAt = NONE,
         updatedAt = time::now()
       WHERE status = "running" AND leaseOwner = $workerId;`,
      {
        jobId: job.id,
        workerId,
        status: exhausted ? "failed" : "queued",
        availableAt: new Date(Date.now() + delayMs),
        error,
      }
    );
  }
}
