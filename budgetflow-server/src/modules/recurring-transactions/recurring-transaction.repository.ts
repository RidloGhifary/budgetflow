import { Prisma, type PrismaClient, type RecurringTransactionStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { DbClient } from "../transactions/transaction.repository";
import type {
  CreateRecurringTransactionInput,
  RecurringTransactionQueryInput,
  UpdateRecurringTransactionInput
} from "./recurring-transaction.validators";

const recurringTransactionInclude = {
  wallet: {
    select: {
      id: true,
      name: true,
      type: true,
      currentBalance: true
    }
  },
  category: {
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      color: true
    }
  }
} satisfies Prisma.RecurringTransactionInclude;

const recurringTransactionDetailInclude = {
  ...recurringTransactionInclude,
  occurrences: {
    orderBy: {
      generatedAt: "desc" as const
    },
    take: 5,
    include: {
      transaction: {
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              type: true,
              currentBalance: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              icon: true,
              color: true
            }
          }
        }
      }
    }
  }
} satisfies Prisma.RecurringTransactionInclude;

export type RecurringTransactionWithRelations = Prisma.RecurringTransactionGetPayload<{
  include: typeof recurringTransactionInclude;
}>;

export type RecurringTransactionDetail = Prisma.RecurringTransactionGetPayload<{
  include: typeof recurringTransactionDetailInclude;
}>;

type Client = DbClient | PrismaClient;

interface CreateRecurringTransactionData extends CreateRecurringTransactionInput {
  nextRunDate: Date | null;
  startDate: Date;
  endDate?: Date | null;
  status: RecurringTransactionStatus;
  userId: string;
}

interface UpdateRecurringTransactionData extends UpdateRecurringTransactionInput {
  nextRunDate?: Date | null;
  status?: RecurringTransactionStatus;
  cancelledAt?: Date | null;
}

export function findRecurringTransactions(userId: string, filters: RecurringTransactionQueryInput) {
  return prisma.recurringTransaction.findMany({
    where: buildRecurringTransactionWhere(userId, filters),
    include: recurringTransactionInclude,
    orderBy: buildOrderBy(filters)
  });
}

export function findRecurringTransactionById(userId: string, id: string, client: Client = prisma) {
  return client.recurringTransaction.findFirst({
    where: {
      id,
      userId
    },
    include: recurringTransactionInclude
  });
}

export function findRecurringTransactionDetail(userId: string, id: string) {
  return prisma.recurringTransaction.findFirst({
    where: {
      id,
      userId
    },
    include: recurringTransactionDetailInclude
  });
}

export function createRecurringTransaction(data: CreateRecurringTransactionData) {
  return prisma.recurringTransaction.create({
    data: {
      userId: data.userId,
      walletId: data.walletId,
      categoryId: data.categoryId,
      name: data.name,
      note: data.note,
      type: data.type,
      amount: data.amount,
      frequency: data.frequency,
      interval: data.interval,
      startDate: data.startDate,
      endDate: data.endDate,
      nextRunDate: data.nextRunDate,
      status: data.status,
      autoGenerate: data.autoGenerate
    },
    include: recurringTransactionInclude
  });
}

export function updateRecurringTransaction(userId: string, id: string, data: UpdateRecurringTransactionData) {
  return prisma.recurringTransaction.updateMany({
    where: {
      id,
      userId
    },
    data
  });
}

export function getUpdatedRecurringTransaction(userId: string, id: string) {
  return findRecurringTransactionById(userId, id);
}

export function findDueRecurringTransactions(userId: string, dueDate: Date) {
  return prisma.recurringTransaction.findMany({
    where: {
      userId,
      status: "ACTIVE",
      autoGenerate: true,
      nextRunDate: {
        lte: dueDate
      }
    },
    orderBy: [{ nextRunDate: "asc" }, { createdAt: "asc" }],
    take: 50
  });
}

export function createRecurringOccurrence(
  data: {
    recurringTransactionId: string;
    scheduledForDate: Date;
    transactionId: string;
  },
  client: DbClient
) {
  return client.recurringTransactionOccurrence.create({
    data
  });
}

export function updateRecurringAfterGeneration(
  id: string,
  data: {
    nextRunDate: Date | null;
    scheduledForDate: Date;
    status: RecurringTransactionStatus;
  },
  client: DbClient
) {
  return client.recurringTransaction.update({
    where: { id },
    data: {
      lastRunDate: data.scheduledForDate,
      nextRunDate: data.nextRunDate,
      status: data.status,
      totalGeneratedCount: {
        increment: 1
      }
    }
  });
}

function buildRecurringTransactionWhere(
  userId: string,
  filters: RecurringTransactionQueryInput
): Prisma.RecurringTransactionWhereInput {
  return {
    userId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.frequency ? { frequency: filters.frequency } : {}),
    ...(filters.walletId ? { walletId: filters.walletId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {})
  };
}

function buildOrderBy(filters: RecurringTransactionQueryInput): Prisma.RecurringTransactionOrderByWithRelationInput[] {
  const direction = filters.sortDirection ?? "asc";

  if (filters.sortBy === "amount") {
    return [{ amount: direction }, { createdAt: "desc" }];
  }

  if (filters.sortBy === "name") {
    return [{ name: direction }, { createdAt: "desc" }];
  }

  if (filters.sortBy === "createdAt") {
    return [{ createdAt: direction }];
  }

  return [{ nextRunDate: { sort: direction, nulls: "last" } }, { createdAt: "desc" }];
}
