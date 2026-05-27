import { Prisma, type BackgroundJobStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const backgroundJobSelect = {
  attempts: true,
  cancelledAt: true,
  completedAt: true,
  createdAt: true,
  createdByUserId: true,
  errorMessage: true,
  errorStack: true,
  failedAt: true,
  id: true,
  lockedAt: true,
  lockedBy: true,
  maxAttempts: true,
  payload: true,
  priority: true,
  progress: true,
  queueName: true,
  result: true,
  runAt: true,
  startedAt: true,
  status: true,
  type: true,
  updatedAt: true
} satisfies Prisma.BackgroundJobSelect;

export type BackgroundJobRecord = Prisma.BackgroundJobGetPayload<{
  select: typeof backgroundJobSelect;
}>;

export interface CreateBackgroundJobData {
  createdByUserId?: string | null;
  maxAttempts?: number;
  payload?: Prisma.InputJsonValue | null;
  priority?: number;
  queueName?: string;
  runAt?: Date;
  type: string;
}

export function createBackgroundJob(data: CreateBackgroundJobData) {
  return prisma.backgroundJob.create({
    data: data as Prisma.BackgroundJobUncheckedCreateInput,
    select: backgroundJobSelect
  });
}

export async function claimNextBackgroundJob({
  lockTimeoutBefore,
  queueName,
  workerId
}: {
  lockTimeoutBefore: Date;
  queueName: string;
  workerId: string;
}) {
  await recoverStaleBackgroundJobs(queueName, lockTimeoutBefore);

  const candidate = await prisma.backgroundJob.findFirst({
    where: {
      queueName,
      status: "PENDING",
      runAt: {
        lte: new Date()
      }
    },
    orderBy: [{ priority: "desc" }, { runAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true
    }
  });

  if (!candidate) {
    return null;
  }

  const claimResult = await prisma.backgroundJob.updateMany({
    where: {
      id: candidate.id,
      status: "PENDING"
    },
    data: {
      attempts: {
        increment: 1
      },
      errorMessage: null,
      errorStack: null,
      lockedAt: new Date(),
      lockedBy: workerId,
      startedAt: new Date(),
      status: "RUNNING"
    }
  });

  if (claimResult.count === 0) {
    return null;
  }

  return findBackgroundJobById(candidate.id);
}

export function findBackgroundJobById(id: string) {
  return prisma.backgroundJob.findUnique({
    where: {
      id
    },
    select: backgroundJobSelect
  });
}

export function markBackgroundJobCompleted(id: string, result: Prisma.InputJsonValue | null) {
  return prisma.backgroundJob.update({
    where: {
      id
    },
    data: {
      completedAt: new Date(),
      failedAt: null,
      lockedAt: null,
      lockedBy: null,
      progress: 100,
      result: result as Prisma.InputJsonValue,
      status: "COMPLETED"
    },
    select: backgroundJobSelect
  });
}

export function markBackgroundJobFailed(id: string, data: { errorMessage: string; errorStack?: string | null }) {
  return prisma.backgroundJob.update({
    where: {
      id
    },
    data: {
      errorMessage: data.errorMessage,
      errorStack: data.errorStack,
      failedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      status: "FAILED"
    },
    select: backgroundJobSelect
  });
}

export function scheduleBackgroundJobRetry(
  id: string,
  data: {
    errorMessage: string;
    errorStack?: string | null;
    runAt: Date;
  }
) {
  return prisma.backgroundJob.update({
    where: {
      id
    },
    data: {
      errorMessage: data.errorMessage,
      errorStack: data.errorStack,
      lockedAt: null,
      lockedBy: null,
      runAt: data.runAt,
      startedAt: null,
      status: "PENDING"
    },
    select: backgroundJobSelect
  });
}

export function updateBackgroundJobProgress(id: string, progress: number, result?: Prisma.InputJsonValue | null) {
  return prisma.backgroundJob.update({
    where: {
      id
    },
    data: {
      progress,
      ...(result !== undefined ? { result: result as Prisma.InputJsonValue } : {})
    },
    select: backgroundJobSelect
  });
}

export function countBackgroundJobsByStatus(userId: string, statuses: BackgroundJobStatus[]) {
  return prisma.backgroundJob.count({
    where: {
      createdByUserId: userId,
      status: {
        in: statuses
      }
    }
  });
}

export function recoverStaleBackgroundJobs(queueName: string, lockedBefore: Date) {
  return prisma.backgroundJob.updateMany({
    where: {
      queueName,
      status: "RUNNING",
      lockedAt: {
        lt: lockedBefore
      }
    },
    data: {
      lockedAt: null,
      lockedBy: null,
      runAt: new Date(),
      startedAt: null,
      status: "PENDING"
    }
  });
}
