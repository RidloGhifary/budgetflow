import { logger } from "../../lib/logger";
import { sanitizeAuditPayload } from "../audit-logs/audit-log.sanitizer";
import type { JobType } from "./background-job.constants";
import {
  claimNextBackgroundJob,
  createBackgroundJob,
  markBackgroundJobCompleted,
  markBackgroundJobFailed,
  scheduleBackgroundJobRetry,
  updateBackgroundJobProgress,
  type BackgroundJobRecord,
} from "./background-job.repository";

export interface EnqueueBackgroundJobInput {
  createdByUserId?: string | null;
  maxAttempts?: number;
  payload?: unknown;
  priority?: number;
  queueName?: string;
  runAt?: Date;
  type: JobType | string;
}

export async function enqueueBackgroundJob(input: EnqueueBackgroundJobInput) {
  const job = await createBackgroundJob({
    createdByUserId: input.createdByUserId ?? null,
    maxAttempts: input.maxAttempts ?? 3,
    payload: sanitizeAuditPayload(input.payload),
    priority: input.priority ?? 0,
    queueName: input.queueName ?? "default",
    runAt: input.runAt ?? new Date(),
    type: input.type,
  });

  logger.info(
    {
      jobId: job.id,
      type: job.type,
      userId: job.createdByUserId,
    },
    "background job created",
  );

  return job;
}

export function claimNextJob(input: {
  lockTimeoutBefore: Date;
  queueName: string;
  workerId: string;
}) {
  return claimNextBackgroundJob(input);
}

export async function completeJob(
  job: BackgroundJobRecord,
  result: unknown = null,
) {
  const completed = await markBackgroundJobCompleted(
    job.id,
    sanitizeAuditPayload(result),
  );

  logger.info(
    {
      attempts: completed.attempts,
      jobId: completed.id,
      type: completed.type,
    },
    "background job completed",
  );

  return completed;
}

export async function failOrRetryJob(job: BackgroundJobRecord, error: unknown) {
  const errorMessage = getSafeErrorMessage(error);
  const errorStack =
    error instanceof Error ? error.stack?.slice(0, 6000) : null;

  if (job.attempts < job.maxAttempts) {
    const retryDelayMs = getRetryDelayMs(job.attempts);
    const retry = await scheduleBackgroundJobRetry(job.id, {
      errorMessage,
      errorStack,
      runAt: new Date(Date.now() + retryDelayMs),
    });

    logger.warn(
      {
        attempts: retry.attempts,
        errorMessage,
        jobId: retry.id,
        nextRunAt: retry.runAt,
        type: retry.type,
      },
      "background job retry scheduled",
    );

    return retry;
  }

  const failed = await markBackgroundJobFailed(job.id, {
    errorMessage,
    errorStack,
  });

  logger.error(
    {
      attempts: failed.attempts,
      errorMessage,
      jobId: failed.id,
      type: failed.type,
    },
    "background job failed",
  );

  return failed;
}

export function updateJobProgress(
  jobId: string,
  progress: number,
  result?: unknown,
) {
  return updateBackgroundJobProgress(
    jobId,
    Math.max(0, Math.min(100, Math.round(progress))),
    result === undefined ? undefined : sanitizeAuditPayload(result),
  );
}

function getRetryDelayMs(attempts: number) {
  return Math.min(60_000, 5_000 * Math.max(1, attempts) ** 2);
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 500);
  }

  return "Job failed";
}
