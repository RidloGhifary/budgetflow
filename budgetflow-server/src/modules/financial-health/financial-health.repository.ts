import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

export interface FinancialHealthPeriodRange {
  endExclusive: Date;
  startDate: Date;
}

export interface BudgetMonth {
  month: number;
  year: number;
}

const budgetInclude = {
  category: {
    select: {
      id: true,
      name: true,
      type: true
    }
  }
} satisfies Prisma.BudgetInclude;

const recurringSelect = {
  amount: true,
  endDate: true,
  frequency: true,
  id: true,
  interval: true,
  nextRunDate: true,
  startDate: true
} satisfies Prisma.RecurringTransactionSelect;

export type FinancialHealthBudgetRecord = Prisma.BudgetGetPayload<{
  include: typeof budgetInclude;
}>;

export type FinancialHealthRecurringRecord = Prisma.RecurringTransactionGetPayload<{
  select: typeof recurringSelect;
}>;

export async function getTransactionTotalsForRange(userId: string, range: FinancialHealthPeriodRange) {
  const totals = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      transactionDate: {
        gte: range.startDate,
        lt: range.endExclusive
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
        summary.totalIncome += amount;
      } else {
        summary.totalExpense += amount;
      }

      return summary;
    },
    {
      totalExpense: 0,
      totalIncome: 0
    }
  );
}

export function findBudgetsForMonths(userId: string, months: BudgetMonth[]) {
  if (months.length === 0) {
    return Promise.resolve([]);
  }

  return prisma.budget.findMany({
    where: {
      userId,
      OR: months.map((month) => ({
        month: month.month,
        year: month.year
      }))
    },
    include: budgetInclude,
    orderBy: [{ year: "asc" }, { month: "asc" }, { category: { name: "asc" } }]
  });
}

export async function getNormalExpenseTotalsByBudgetMonth(
  userId: string,
  budgets: Array<Pick<FinancialHealthBudgetRecord, "categoryId" | "month" | "year">>,
  rangeByMonthKey: Map<string, FinancialHealthPeriodRange>
) {
  const totalsByBudgetMonth = new Map<string, number>();
  const budgetsByMonth = new Map<string, Array<Pick<FinancialHealthBudgetRecord, "categoryId" | "month" | "year">>>();

  for (const budget of budgets) {
    const monthKey = getBudgetMonthKey(budget);
    const existing = budgetsByMonth.get(monthKey) ?? [];

    existing.push(budget);
    budgetsByMonth.set(monthKey, existing);
  }

  await Promise.all(
    Array.from(budgetsByMonth.entries()).map(async ([monthKey, monthBudgets]) => {
      const range = rangeByMonthKey.get(monthKey);

      if (!range) {
        return;
      }

      const totals = await prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          categoryId: {
            in: monthBudgets.map((budget) => budget.categoryId)
          },
          purpose: "NORMAL",
          transactionDate: {
            gte: range.startDate,
            lt: range.endExclusive
          },
          type: "EXPENSE",
          userId
        },
        _sum: {
          amount: true
        }
      });

      for (const total of totals) {
        totalsByBudgetMonth.set(`${monthKey}:${total.categoryId}`, Number(total._sum.amount ?? 0));
      }
    })
  );

  return totalsByBudgetMonth;
}

export function findActiveRecurringExpenseRules(userId: string) {
  return prisma.recurringTransaction.findMany({
    where: {
      status: "ACTIVE",
      type: "EXPENSE",
      userId
    },
    orderBy: [{ nextRunDate: "asc" }, { createdAt: "asc" }],
    select: recurringSelect
  });
}

export function getBudgetMonthKey(value: BudgetMonth) {
  return `${value.year}-${String(value.month).padStart(2, "0")}`;
}
