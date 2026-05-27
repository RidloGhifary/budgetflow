import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { getMonthRange } from "../../utils/date-range";

const budgetInclude = {
  category: {
    select: {
      id: true,
      name: true,
      type: true
    }
  }
} satisfies Prisma.BudgetInclude;

const recurringReminderSelect = {
  id: true,
  name: true,
  nextRunDate: true,
  status: true,
  type: true,
  userId: true
} satisfies Prisma.RecurringTransactionSelect;

export type SmartBudgetRecord = Prisma.BudgetGetPayload<{
  include: typeof budgetInclude;
}>;

export type SmartRecurringReminderRecord = Prisma.RecurringTransactionGetPayload<{
  select: typeof recurringReminderSelect;
}>;

export async function findBudgetUsageForCategoryMonth(
  userId: string,
  input: {
    categoryId: string;
    month: number;
    year: number;
  }
) {
  const budget = await prisma.budget.findFirst({
    where: {
      categoryId: input.categoryId,
      month: input.month,
      userId,
      year: input.year
    },
    include: budgetInclude
  });

  if (!budget) {
    return null;
  }

  const range = getMonthRange(input.month, input.year);
  const usedAmount = await prisma.transaction.aggregate({
    where: {
      categoryId: input.categoryId,
      purpose: "NORMAL",
      transactionDate: {
        gte: range.startDate,
        lt: range.endDate
      },
      type: "EXPENSE",
      userId
    },
    _sum: {
      amount: true
    }
  });
  const limitAmount = Number(budget.limitAmount);
  const used = Number(usedAmount._sum.amount ?? 0);

  return {
    budget,
    limitAmount,
    usedAmount: used,
    usagePercentage: limitAmount > 0 ? (used / limitAmount) * 100 : 0
  };
}

export async function getCategoryHistoricalExpenseStats(
  userId: string,
  input: {
    categoryId: string;
    excludeTransactionId: string;
    transactionDate: Date;
  }
) {
  const startDate = new Date(input.transactionDate);

  startDate.setUTCDate(startDate.getUTCDate() - 30);

  const result = await prisma.transaction.aggregate({
    where: {
      categoryId: input.categoryId,
      id: {
        not: input.excludeTransactionId
      },
      purpose: "NORMAL",
      transactionDate: {
        gte: startDate,
        lt: input.transactionDate
      },
      type: "EXPENSE",
      userId
    },
    _avg: {
      amount: true
    },
    _count: {
      _all: true
    }
  });

  return {
    averageAmount: result._avg.amount ? Number(result._avg.amount) : null,
    count: result._count._all
  };
}

export async function getMonthlyFinancialTotals(userId: string, month: number, year: number) {
  const range = getMonthRange(month, year);
  const totals = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      transactionDate: {
        gte: range.startDate,
        lt: range.endDate
      },
      userId
    },
    _sum: {
      amount: true
    }
  });

  return totals.reduce(
    (summary, total) => {
      const amount = Number(total._sum.amount ?? 0);

      if (total.type === "INCOME") {
        summary.incomeTotal += amount;
      } else {
        summary.expenseTotal += amount;
      }

      return summary;
    },
    {
      expenseTotal: 0,
      incomeTotal: 0
    }
  );
}

export function findRecurringReminderRule(userId: string, id: string) {
  return prisma.recurringTransaction.findFirst({
    where: {
      id,
      userId
    },
    select: recurringReminderSelect
  });
}
