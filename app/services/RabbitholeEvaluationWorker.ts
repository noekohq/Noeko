import { randomUUID } from "node:crypto";
import {
  RabbitholeEvaluationJobModel,
  type RabbitholeEvaluationJob,
} from "../database/models/rabbithole_evaluation_job";
import RabbitholeRecommendations from "./RabbitholeRecommendations";
import { logger } from "./Logger";

export class RabbitholeEvaluationWorker {
  private readonly workerId = `rabbithole-worker-${process.pid}-${randomUUID()}`;
  private readonly activeJobs = new Set<string>();
  private pollTimer?: ReturnType<typeof setInterval>;
  private readonly maxAttempts = 5;

  constructor(private readonly leaseDurationMs = 30_000) {}

  start(): void {
    if (this.pollTimer) return;
    void this.recover();
    this.pollTimer = setInterval(() => void this.recover(), 2_000);
    this.pollTimer.unref?.();
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = undefined;
  }

  private leaseUntil(): Date {
    return new Date(Date.now() + this.leaseDurationMs);
  }

  private async recover(): Promise<void> {
    try {
      const jobs = await RabbitholeEvaluationJobModel.findClaimable();
      for (const job of jobs) this.dispatch(job);
    } catch (error) {
      void logger.error("Unable to recover queued Rabbithole evaluations", { error });
    }
  }

  private dispatch(job: RabbitholeEvaluationJob): void {
    const id = job.id.toString();
    if (this.activeJobs.has(id)) return;
    this.activeJobs.add(id);
    void this.process(job.id).finally(() => this.activeJobs.delete(id));
  }

  private async process(jobId: RabbitholeEvaluationJob["id"]): Promise<void> {
    const job = await RabbitholeEvaluationJobModel.claim(
      jobId,
      this.workerId,
      this.leaseUntil(),
      this.maxAttempts
    );
    if (!job) return;

    const leaseTimer = setInterval(
      () =>
        void RabbitholeEvaluationJobModel.renewLease(
          job.id,
          this.workerId,
          this.leaseUntil()
        ).catch((error) =>
          logger.error("Unable to renew Rabbithole evaluation lease", {
            jobId: job.id.toString(),
            error,
          })
        ),
      Math.max(1_000, Math.floor(this.leaseDurationMs / 3))
    );
    leaseTimer.unref?.();

    try {
      await RabbitholeRecommendations.evaluateThingForOwners(job.thingId);
      await RabbitholeEvaluationJobModel.complete(job.id, this.workerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await logger.error("Background Rabbithole evaluation failed", {
        jobId: job.id.toString(),
        thingId: job.thingId.toString(),
        attempt: job.attempt,
        error,
      });
      await RabbitholeEvaluationJobModel.retryOrFail(job, this.workerId, message, this.maxAttempts);
    } finally {
      clearInterval(leaseTimer);
    }
  }
}

export const rabbitholeEvaluationWorker = new RabbitholeEvaluationWorker();

export const initRabbitholeEvaluationWorker = async () => {
  rabbitholeEvaluationWorker.start();
};
