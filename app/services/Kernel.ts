import { Queue, Worker, Job, ConnectionOptions, JobsOptions } from "bullmq";
import { logger } from "./Logger";

// Define the structure for our job handlers
// The handler receives typed data and returns a promise
type JobHandler<T = any> = (data: T) => Promise<void>;

/**
 * Kernel Service (Singleton)
 * A wrapper around BullMQ to centralize job scheduling and processing.
 */
export class Kernel {
  private static instance: Kernel;

  public readonly queue: Queue;
  private readonly worker: Worker;
  private readonly jobHandlers: Map<string, JobHandler>;

  private constructor() {
    this.jobHandlers = new Map();

    const connection: ConnectionOptions = {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT
        ? parseInt(process.env.REDIS_PORT, 10)
        : 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    };

    const queueName = "app-task-queue";

    this.queue = new Queue(queueName, { connection });

    this.worker = new Worker(
      queueName,
      async (job: Job) => {
        const handler = this.jobHandlers.get(job.name);
        if (handler) {
          logger.info(`[Kernel] Processing job '${job.name}' (ID: ${job.id})`);
          await handler(job.data);
        } else {
          throw new Error(
            `[Kernel] No handler registered for job type: ${job.name}`,
          );
        }
      },
      { connection },
    );

    this.worker.on("completed", (job: Job) => {
      logger.info(`[Kernel] Completed job '${job.name}' (ID: ${job.id})`);
    });

    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      if (job) {
        logger.error(
          `[Kernel] Failed job '${job.name}' (ID: ${job.id}):`,
          error,
        );
      } else {
        logger.error(`[Kernel] A job failed with no job data:`, error);
      }
    });

    logger.info("[Kernel] Singleton initialized. Worker is active.");
  }

  /**
   * Gets the single instance of the Kernel.
   */
  public static getInstance(): Kernel {
    if (!Kernel.instance) {
      Kernel.instance = new Kernel();
    }
    return Kernel.instance;
  }

  // --- PUBLIC API ---

  /**
   * Registers the logic for a specific job type.
   * All potential jobs must be registered on application startup.
   * @param name The unique name of the job (e.g., 'send-welcome-email').
   * @param handler The async function that will process the job.
   */
  public registerJob<T>(name: string, handler: JobHandler<T>): void {
    if (this.jobHandlers.has(name)) {
      logger.warn(
        `[Kernel] Warning: Overwriting handler for job type '${name}'.`,
      );
    }
    this.jobHandlers.set(name, handler);
    logger.info(`[Kernel] Registered handler for job '${name}'.`);
  }

  /**
   * Schedules a one-time job to run at a specific future time.
   * @param jobName The registered name of the job.
   * @param data The payload/data for the job.
   * @param runAt The Date object specifying when the job should execute.
   * @returns The BullMQ Job object.
   */
  public async scheduleOnce<T>(
    jobName: string,
    data: T,
    runAt: Date,
  ): Promise<Job<T>> {
    if (!this.jobHandlers.has(jobName)) {
      throw new Error(
        `[Kernel] Cannot schedule job: No handler registered for '${jobName}'.`,
      );
    }

    const delay = runAt.getTime() - Date.now();
    if (delay < 0) {
      throw new Error("[Kernel] Cannot schedule a job in the past.");
    }

    logger.info(
      `[Kernel] Scheduling one-time job '${jobName}' to run at ${runAt.toISOString()}.`,
    );
    return this.queue.add(jobName, data, { delay });
  }

  /**
   * Schedules a recurring job based on a CRON expression.
   * @param jobName The registered name of the job.
   * @param data The payload/data for the job.
   * @param cron The CRON string defining the schedule (e.g., '0 2 * * *' for 2 AM daily).
   * @returns The BullMQ Job object.
   */
  public async scheduleRecurring<T>(
    jobName: string,
    data: T,
    cron: string,
  ): Promise<Job<T>> {
    if (!this.jobHandlers.has(jobName)) {
      throw new Error(
        `[Kernel] Cannot schedule job: No handler registered for '${jobName}'.`,
      );
    }

    // Use a consistent job ID to prevent creating duplicate recurring jobs.
    // BullMQ will update the job if one with the same ID already exists.
    const jobId = `recurring-${jobName}`;
    const repeatOpts: JobsOptions["repeat"] = { pattern: cron };

    logger.info(
      `[Kernel] Scheduling recurring job '${jobName}' with CRON '${cron}'.`,
    );
    return this.queue.add(jobName, data, { repeat: repeatOpts, jobId });
  }

  /**
   * Gracefully shuts down the queue and worker connections.
   * Essential for a clean server exit.
   */
  public async shutdown(): Promise<void> {
    logger.info("[Kernel] Shutting down...");
    await this.worker.close();
    await this.queue.close();
    logger.info("[Kernel] Shutdown complete.");
  }
}

export const getKernel = () => {
  return Kernel.getInstance();
};
