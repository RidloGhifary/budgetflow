import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  CalendarDayDetailQueryInput,
  CalendarSummaryQueryInput
} from "./calendar.validators";

const calendarTransactionSummarySelect = {
  amount: true,
  categoryId: true,
  id: true,
  recurringTransactionId: true,
  transactionDate: true,
  type: true,
  walletId: true
} satisfies Prisma.TransactionSelect;

const calendarTransactionInclude = {
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
} satisfies Prisma.TransactionInclude;

const calendarRecurringTransactionInclude = {
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

export type CalendarTransactionSummaryRecord = Prisma.TransactionGetPayload<{
  select: typeof calendarTransactionSummarySelect;
}>;

export type CalendarTransactionDetailRecord = Prisma.TransactionGetPayload<{
  include: typeof calendarTransactionInclude;
}>;

export type CalendarRecurringTransactionRecord = Prisma.RecurringTransactionGetPayload<{
  include: typeof calendarRecurringTransactionInclude;
}>;

type CalendarFilters = Pick<CalendarSummaryQueryInput, "categoryId" | "type" | "walletId">;

export function findCalendarTransactionSummaries(
  userId: string,
  filters: CalendarFilters & { endExclusive: Date; startDate: Date }
) {
  return prisma.transaction.findMany({
    where: buildCalendarTransactionWhere(userId, filters),
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
    select: calendarTransactionSummarySelect
  });
}

export async function findCalendarDayTransactions(
  userId: string,
  filters: Pick<CalendarDayDetailQueryInput, "categoryId" | "page" | "pageSize" | "type" | "walletId"> & {
    endExclusive: Date;
    startDate: Date;
  }
) {
  const where = buildCalendarTransactionWhere(userId, filters);
  const [transactions, totalItems] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: calendarTransactionInclude,
      orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize
    }),
    prisma.transaction.count({ where })
  ]);

  return {
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize))
    },
    transactions
  };
}

export function findCalendarRecurringTransactions(
  userId: string,
  filters: CalendarFilters & { endDate: Date; startDate: Date }
) {
  return prisma.recurringTransaction.findMany({
    where: {
      userId,
      status: "ACTIVE",
      nextRunDate: {
        not: null,
        lte: filters.endDate
      },
      startDate: {
        lte: filters.endDate
      },
      OR: [
        {
          endDate: null
        },
        {
          endDate: {
            gte: filters.startDate
          }
        }
      ],
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.walletId ? { walletId: filters.walletId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {})
    },
    include: calendarRecurringTransactionInclude,
    orderBy: [{ nextRunDate: "asc" }, { name: "asc" }]
  });
}

export function findGeneratedRecurringOccurrenceKeys(
  recurringTransactionIds: string[],
  startDate: Date,
  endExclusive: Date
) {
  if (recurringTransactionIds.length === 0) {
    return Promise.resolve([]);
  }

  return prisma.recurringTransactionOccurrence.findMany({
    where: {
      recurringTransactionId: {
        in: recurringTransactionIds
      },
      scheduledForDate: {
        gte: startDate,
        lt: endExclusive
      }
    },
    select: {
      recurringTransactionId: true,
      scheduledForDate: true
    }
  });
}

function buildCalendarTransactionWhere(
  userId: string,
  filters: CalendarFilters & { endExclusive: Date; startDate: Date }
): Prisma.TransactionWhereInput {
  return {
    userId,
    transactionDate: {
      gte: filters.startDate,
      lt: filters.endExclusive
    },
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.walletId ? { walletId: filters.walletId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {})
  };
}
