import { randomUUID } from "node:crypto";

import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { claimNextJob, completeJob, failOrRetryJob, updateJobProgress } from "./background-job.service";
import type { JobRegistry } from "./job-registry";

export class WorkerRunner {
  private activeCount = 0;
  private isStopping = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly workerId = `worker-${randomUUID()}`;

  constructor(
    private readonly registry: JobRegistry,
    private readonly options = {
      concurrency: env.jobs.concurrency,
      lockTimeoutMs: env.jobs.lockTimeoutMs,
      pollIntervalMs: env.jobs.pollIntervalMs,
      queueName: "default"
    }
  ) {}

  start() {
    logger.info(
      {
        concurrency: this.options.concurrency,
        pollIntervalMs: this.options.pollIntervalMs,
        queueName: this.options.queueName,
        workerId: this.workerId
      },
      "background worker started"
    );

    this.timer = setInterval(() => {
      void this.tick();
    }, this.options.pollIntervalMs);
    void this.tick();
  }

  async stop() {
    this.isStopping = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    while (this.activeCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    logger.info({ workerId: this.workerId }, "background worker stopped");
  }

  private async tick() {
    if (this.isStopping) {
      return;
    }

    while (!this.isStopping && this.activeCount < this.options.concurrency) {
      const job = await claimNextJob({
        lockTimeoutBefore: new Date(Date.now() - this.options.lockTimeoutMs),
        queueName: this.options.queueName,
        workerId: this.workerId
      });

      if (!job) {
        return;
      }

      this.activeCount += 1;
      void this.processJob(job).finally(() => {
        this.activeCount -= 1;
      });
    }
  }

  private async processJob(job: Awaited<ReturnType<typeof claimNextJob>>) {
    if (!job) {
      return;
    }

    const startedAt = Date.now();

    logger.info(
      {
        attempts: job.attempts,
        jobId: job.id,
        type: job.type,
        userId: job.createdByUserId,
        workerId: this.workerId
      },
      "background job started"
    );

    try {
      const handler = this.registry.get(job.type);
      const result = await handler.handle(job, {
        updateProgress: (progress, progressResult) => updateJobProgress(job.id, progress, progressResult)
      });

      await completeJob(job, result);
      logger.info(
        {
          durationMs: Date.now() - startedAt,
          jobId: job.id,
          type: job.type
        },
        "background job handler completed"
      );
    } catch (error) {
      await failOrRetryJob(job, error);
    }
  }
}
