import { randomUUID } from "node:crypto";
import type { RecordId, StringRecordId } from "surrealdb";
import { SpyglassRunModel } from "../database/models/spyglass_run";
import type { SpyglassRun, SpyglassRunEventType } from "../../shared/types/spyglass-run";
import Spyglass from "./Spyglass";
import { logger } from "./Logger";

type AnalysisEvent = {
  type: SpyglassRunEventType | "glimpse_chunk";
  data: unknown;
};

type AnalysisGeneratorFactory = (run: SpyglassRun) => AsyncGenerator<AnalysisEvent, void, unknown>;

const terminalEventTypes = new Set<SpyglassRunEventType>(["completed", "error", "cancelled"]);

export class SpyglassRunWorker {
  private readonly workerId = `spyglass-worker-${process.pid}-${randomUUID()}`;
  private readonly activeRuns = new Set<string>();
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly generatorFactory: AnalysisGeneratorFactory = (run) =>
      Spyglass.runAnalysisGenerator({
        userId: run.userId.toString(),
        query: run.query,
        scope: run.configuration.scope,
        deepAnalysis: true,
        rabbithole: run.configuration.rabbithole,
        tags: run.configuration.tags,
        date: run.configuration.date,
        history: run.configuration.history,
      }) as AsyncGenerator<AnalysisEvent, void, unknown>,
    private readonly leaseDurationMs = 30_000
  ) {}

  start(): void {
    if (this.pollTimer) return;
    void this.recover();
    this.pollTimer = setInterval(() => void this.recover(), 5_000);
    this.pollTimer.unref?.();
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = undefined;
  }

  async waitForIdle(timeoutMs = 5_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.activeRuns.size > 0) {
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for ${this.activeRuns.size} Spyglass worker task(s)`);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  dispatch(runId: string | RecordId | StringRecordId): void {
    const id = runId.toString();
    if (this.activeRuns.has(id)) return;
    this.activeRuns.add(id);
    void this.process(id).finally(() => this.activeRuns.delete(id));
  }

  private async recover(): Promise<void> {
    try {
      const claimable = await SpyglassRunModel.findClaimable();
      for (const run of claimable) this.dispatch(run.id);
    } catch (error) {
      logger.error("Unable to recover queued Spyglass runs", { error });
    }
  }

  private leaseUntil(): Date {
    return new Date(Date.now() + this.leaseDurationMs);
  }

  private async persistEvent(
    runId: string | RecordId | StringRecordId,
    type: SpyglassRunEventType,
    data: unknown
  ): Promise<void> {
    await SpyglassRunModel.applyEvent(runId, type, data);
    await SpyglassRunModel.appendEvent(runId, type, data);
  }

  async process(runId: string | RecordId | StringRecordId): Promise<void> {
    const run = await SpyglassRunModel.claim(runId, this.workerId, this.leaseUntil());
    if (!run) return;

    let leaseTimer: ReturnType<typeof setInterval> | undefined;
    try {
      if (run.attempt > 1) {
        await this.persistEvent(
          run.id,
          "reset",
          `Restarting after an expired worker lease (attempt ${run.attempt}).`
        );
      }
      await this.persistEvent(run.id, "status", "Starting durable Deep Focus analysis.");
      leaseTimer = setInterval(
        () => {
          void SpyglassRunModel.renewLease(run.id, this.workerId, this.leaseUntil()).catch(
            (error) =>
              logger.error("Unable to renew Spyglass worker lease", {
                runId: run.id.toString(),
                error,
              })
          );
        },
        Math.max(1_000, Math.floor(this.leaseDurationMs / 3))
      );
      leaseTimer.unref?.();

      const generator = this.generatorFactory(run);
      for await (const event of generator) {
        if (await SpyglassRunModel.isCancellationRequested(run.id)) {
          await generator.return(undefined);
          await this.persistEvent(run.id, "cancelled", "Cancelled by user.");
          await SpyglassRunModel.finish(run.id, "cancelled");
          return;
        }

        if (event.type === "glimpse_chunk") {
          throw new Error("A Deep Focus worker received a Glimpse event");
        }
        if (event.type === "error") {
          const message =
            typeof event.data === "string" ? event.data : "Deep Focus analysis failed.";
          await this.persistEvent(run.id, "error", message);
          await SpyglassRunModel.finish(run.id, "failed", message);
          return;
        }

        await this.persistEvent(run.id, event.type, event.data);
        if (event.type === "completed") {
          await SpyglassRunModel.finish(run.id, "completed");
          return;
        }
      }

      const finalRun = await SpyglassRunModel.getById(run.id);
      if (!finalRun || !["completed", "failed", "cancelled"].includes(finalRun.status)) {
        throw new Error("Deep Focus analysis ended without a terminal event");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Durable Spyglass run failed", { runId: run.id.toString(), error });
      await SpyglassRunModel.appendEvent(run.id, "error", message);
      await SpyglassRunModel.finish(run.id, "failed", message);
    } finally {
      if (leaseTimer) clearInterval(leaseTimer);
    }
  }
}

export const spyglassRunWorker = new SpyglassRunWorker();

export const initSpyglassRunWorker = async () => {
  spyglassRunWorker.start();
};
