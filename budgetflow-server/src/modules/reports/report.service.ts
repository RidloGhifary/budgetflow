import { Prisma, type TransactionType } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { getMonthLabel, getMonthRange, resolveMonthYear } from "../../utils/date-range";
import { calculateBudgetSummary } from "../budgets/budget.service";
import { getDebtSummary, listDebts } from "../debts/debt.service";
import { getGoalSummary, listGoals } from "../goals/goal.service";
import type {
  BudgetReportQueryInput,
  DebtReportQueryInput,
  MonthlyReportQueryInput,
  RangeReportQueryInput,
  SavingGoalReportQueryInput,
  TransactionReportQueryInput
} from "./report.validators";

const reportTransactionInclude = {
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

type ReportTransactionRecord = Prisma.TransactionGetPayload<{
  include: typeof reportTransactionInclude;
}>;
type DebtReportItem = Awaited<ReturnType<typeof listDebts>>[number];
type SavingGoalReportItem = Awaited<ReturnType<typeof listGoals>>[number];

interface ExclusiveDateRange {
  startDate: Date;
  endDate: Date;
}

export async function getMonthlyReport(userId: string, input: MonthlyReportQueryInput) {
  const { month, year } = resolveMonthYear(input);
  const range = getMonthRange(month, year);
  const [
    transactions,
    availableBalance,
    budgetSummary,
    debtSummary,
    savingGoalSummary,
    debts,
    savingGoals,
    periodDebtPayments,
    periodSavingContributions
  ] = await Promise.all([
    findReportTransactions(userId, {}, range),
    getAvailableBalance(userId),
    calculateBudgetSummary(userId, month, year),
    getDebtSummary(userId),
    getGoalSummary(userId),
    listDebts(userId, {}),
    listGoals(userId, {}),
    getPeriodDebtPaymentSummary(userId, range),
    getPeriodSavingContributionSummary(userId, range)
  ]);
  const mappedTransactions = transactions.map(toReportTransaction);
  const financialSummary = getFinancialSummary(mappedTransactions);

  return {
    period: {
      type: "monthly",
      month,
      year,
      label: getMonthLabel(month, year),
      startDate: range.startDate,
      endDate: range.endDate,
      endDateIsExclusive: true
    },
    financialSummary: {
      ...financialSummary,
      availableBalance,
      netCashFlow: financialSummary.totalIncome - financialSummary.totalExpense
    },
    expenseByCategory: getCategoryBreakdown(mappedTransactions, "EXPENSE"),
    incomeByCategory: getCategoryBreakdown(mappedTransactions, "INCOME"),
    budgetSummary,
    debtSummary,
    savingGoalSummary,
    periodDebtPayments,
    periodSavingContributions,
    debts,
    savingGoals,
    transactions: mappedTransactions,
    recentTransactions: mappedTransactions.slice(0, 10)
  };
}

export async function getRangeReport(userId: string, input: RangeReportQueryInput) {
  const range = getInclusiveDayRange(input.startDate, input.endDate);
  const [
    transactions,
    availableBalance,
    budgetSummaries,
    debtSummary,
    savingGoalSummary,
    debts,
    savingGoals,
    periodDebtPayments,
    periodSavingContributions
  ] = await Promise.all([
    findReportTransactions(userId, {}, range),
    getAvailableBalance(userId),
    getBudgetSummariesForDateRange(userId, range),
    getDebtSummary(userId),
    getGoalSummary(userId),
    listDebts(userId, {}),
    listGoals(userId, {}),
    getPeriodDebtPaymentSummary(userId, range),
    getPeriodSavingContributionSummary(userId, range)
  ]);
  const mappedTransactions = transactions.map(toReportTransaction);
  const financialSummary = getFinancialSummary(mappedTransactions);

  return {
    period: {
      type: "range",
      startDate: range.startDate,
      endDate: range.endDate,
      endDateIsExclusive: true,
      label: `${toDateOnly(range.startDate)} to ${toDateOnly(input.endDate)}`
    },
    financialSummary: {
      ...financialSummary,
      availableBalance,
      netCashFlow: financialSummary.totalIncome - financialSummary.totalExpense
    },
    expenseByCategory: getCategoryBreakdown(mappedTransactions, "EXPENSE"),
    incomeByCategory: getCategoryBreakdown(mappedTransactions, "INCOME"),
    budgetSummaries,
    debtSummary,
    savingGoalSummary,
    periodDebtPayments,
    periodSavingContributions,
    debts,
    savingGoals,
    transactions: mappedTransactions,
    recentTransactions: mappedTransactions.slice(0, 10)
  };
}

export async function getTransactionReport(userId: string, input: TransactionReportQueryInput) {
  const transactions = (await findReportTransactions(userId, input)).map(toReportTransaction);
  const financialSummary = getFinancialSummary(transactions);

  return {
    filters: input,
    financialSummary: {
      ...financialSummary,
      netCashFlow: financialSummary.totalIncome - financialSummary.totalExpense
    },
    expenseByCategory: getCategoryBreakdown(transactions, "EXPENSE"),
    incomeByCategory: getCategoryBreakdown(transactions, "INCOME"),
    transactions
  };
}

export async function getBudgetReport(userId: string, input: BudgetReportQueryInput) {
  const { month, year } = resolveMonthYear(input);
  const range = getMonthRange(month, year);
  const summary = await calculateBudgetSummary(userId, month, year);

  return {
    period: {
      type: "monthly",
      month,
      year,
      label: getMonthLabel(month, year),
      startDate: range.startDate,
      endDate: range.endDate,
      endDateIsExclusive: true
    },
    summary
  };
}

export async function getDebtReport(userId: string, input: DebtReportQueryInput) {
  const [debts, summary] = await Promise.all([
    listDebts(userId, input),
    getDebtSummary(userId)
  ]);

  return {
    filters: input,
    summary,
    filteredTotals: getDebtTotals(debts),
    debts
  };
}

export async function getSavingGoalReport(userId: string, input: SavingGoalReportQueryInput) {
  const [goals, summary] = await Promise.all([
    listGoals(userId, input),
    getGoalSummary(userId)
  ]);

  return {
    filters: input,
    summary,
    filteredTotals: getSavingGoalTotals(goals),
    goals
  };
}

async function findReportTransactions(
  userId: string,
  filters: TransactionReportQueryInput,
  fixedRange?: ExclusiveDateRange
) {
  const andFilters: Prisma.TransactionWhereInput[] = [{ userId }];

  if (filters.type) {
    andFilters.push({ type: filters.type });
  }

  if (filters.purpose) {
    andFilters.push({ purpose: filters.purpose });
  }

  if (filters.walletId) {
    andFilters.push({ walletId: filters.walletId });
  }

  if (filters.categoryId) {
    andFilters.push({ categoryId: filters.categoryId });
  }

  if (fixedRange) {
    andFilters.push({
      transactionDate: {
        gte: fixedRange.startDate,
        lt: fixedRange.endDate
      }
    });
  }

  if (!fixedRange && filters.year) {
    const range = filters.month
      ? getMonthRange(filters.month, filters.year)
      : {
          startDate: new Date(Date.UTC(filters.year, 0, 1)),
          endDate: new Date(Date.UTC(filters.year + 1, 0, 1))
        };

    andFilters.push({
      transactionDate: {
        gte: range.startDate,
        lt: range.endDate
      }
    });
  }

  if (!fixedRange && (filters.startDate || filters.endDate)) {
    andFilters.push({
      transactionDate: {
        ...(filters.startDate ? { gte: startOfUtcDay(filters.startDate) } : {}),
        ...(filters.endDate ? { lt: addUtcDays(startOfUtcDay(filters.endDate), 1) } : {})
      }
    });
  }

  if (filters.search) {
    andFilters.push({
      OR: [
        {
          note: {
            contains: filters.search,
            mode: "insensitive"
          }
        },
        {
          wallet: {
            name: {
              contains: filters.search,
              mode: "insensitive"
            }
          }
        },
        {
          category: {
            name: {
              contains: filters.search,
              mode: "insensitive"
            }
          }
        }
      ]
    });
  }

  return prisma.transaction.findMany({
    where: {
      AND: andFilters
    },
    include: reportTransactionInclude,
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }]
  });
}

function toReportTransaction(transaction: ReportTransactionRecord) {
  return {
    id: transaction.id,
    userId: transaction.userId,
    walletId: transaction.walletId,
    categoryId: transaction.categoryId,
    recurringTransactionId: transaction.recurringTransactionId,
    type: transaction.type,
    purpose: transaction.purpose,
    amount: Number(transaction.amount),
    transactionDate: transaction.transactionDate,
    note: transaction.note,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    wallet: {
      id: transaction.wallet.id,
      name: transaction.wallet.name,
      type: transaction.wallet.type,
      currentBalance: Number(transaction.wallet.currentBalance)
    },
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      type: transaction.category.type,
      icon: transaction.category.icon,
      color: transaction.category.color
    }
  };
}

function getFinancialSummary(transactions: ReturnType<typeof toReportTransaction>[]) {
  return transactions.reduce(
    (summary, transaction) => {
      const amount = transaction.amount;

      summary.transactionCount += 1;

      if (transaction.type === "INCOME") {
        summary.totalIncome += amount;
        summary.incomeTransactionCount += 1;

        if (transaction.purpose === "DEBT_COLLECTION") {
          summary.debtCollections += amount;
        }
      }

      if (transaction.type === "EXPENSE") {
        summary.totalExpense += amount;
        summary.expenseTransactionCount += 1;

        if (transaction.purpose === "NORMAL") {
          summary.normalExpense += amount;
        }

        if (transaction.purpose === "DEBT_PAYMENT") {
          summary.debtPayments += amount;
        }

        if (transaction.purpose === "SAVING_CONTRIBUTION") {
          summary.savingContributions += amount;
        }
      }

      return summary;
    },
    {
      totalIncome: 0,
      totalExpense: 0,
      normalExpense: 0,
      debtPayments: 0,
      debtCollections: 0,
      savingContributions: 0,
      transactionCount: 0,
      incomeTransactionCount: 0,
      expenseTransactionCount: 0
    }
  );
}

function getCategoryBreakdown(transactions: ReturnType<typeof toReportTransaction>[], type: TransactionType) {
  const matchingTransactions = transactions.filter((transaction) => transaction.type === type);
  const totalAmount = matchingTransactions.reduce((total, transaction) => total + transaction.amount, 0);
  const totalsByCategory = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      categoryType: string;
      icon?: string | null;
      color?: string | null;
      totalAmount: number;
      transactionCount: number;
    }
  >();

  matchingTransactions.forEach((transaction) => {
    const existing = totalsByCategory.get(transaction.categoryId);

    if (existing) {
      existing.totalAmount += transaction.amount;
      existing.transactionCount += 1;
      return;
    }

    totalsByCategory.set(transaction.categoryId, {
      categoryId: transaction.categoryId,
      categoryName: transaction.category.name,
      categoryType: transaction.category.type,
      icon: transaction.category.icon,
      color: transaction.category.color,
      totalAmount: transaction.amount,
      transactionCount: 1
    });
  });

  return Array.from(totalsByCategory.values())
    .map((item) => ({
      ...item,
      percentage: totalAmount > 0 ? (item.totalAmount / totalAmount) * 100 : 0
    }))
    .sort((left, right) => right.totalAmount - left.totalAmount);
}

async function getAvailableBalance(userId: string) {
  const aggregate = await prisma.wallet.aggregate({
    where: {
      userId
    },
    _sum: {
      currentBalance: true
    }
  });

  return Number(aggregate._sum.currentBalance ?? 0);
}

async function getPeriodDebtPaymentSummary(userId: string, range: ExclusiveDateRange) {
  const aggregate = await prisma.debtPayment.aggregate({
    where: {
      userId,
      paymentDate: {
        gte: range.startDate,
        lt: range.endDate
      }
    },
    _count: {
      _all: true
    },
    _sum: {
      amount: true
    }
  });

  return {
    paymentCount: aggregate._count._all,
    totalAmount: Number(aggregate._sum.amount ?? 0)
  };
}

async function getPeriodSavingContributionSummary(userId: string, range: ExclusiveDateRange) {
  const aggregate = await prisma.savingContribution.aggregate({
    where: {
      userId,
      contributionDate: {
        gte: range.startDate,
        lt: range.endDate
      }
    },
    _count: {
      _all: true
    },
    _sum: {
      amount: true
    }
  });

  return {
    contributionCount: aggregate._count._all,
    totalAmount: Number(aggregate._sum.amount ?? 0)
  };
}

async function getBudgetSummariesForDateRange(userId: string, range: ExclusiveDateRange) {
  const months = getMonthsBetween(range.startDate, addUtcDays(range.endDate, -1));

  return Promise.all(months.map(({ month, year }) => calculateBudgetSummary(userId, month, year)));
}

function getDebtTotals(debts: DebtReportItem[]) {
  return debts.reduce(
    (totals, debt) => {
      totals.debtCount += 1;
      totals.totalAmount += debt.totalAmount;
      totals.paidAmount += debt.paidAmount;
      totals.remainingAmount += debt.remainingAmount;
      totals.statusCounts[debt.status] += 1;
      totals.typeCounts[debt.type] += 1;

      return totals;
    },
    {
      debtCount: 0,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      statusCounts: {
        UNPAID: 0,
        PARTIAL: 0,
        PAID: 0
      },
      typeCounts: {
        I_OWE: 0,
        OWED_TO_ME: 0
      }
    }
  );
}

function getSavingGoalTotals(goals: SavingGoalReportItem[]) {
  const totals = goals.reduce(
    (summary, goal) => {
      summary.goalCount += 1;
      summary.totalTargetAmount += goal.targetAmount;
      summary.totalSavedAmount += goal.currentAmount;
      summary.totalRemainingAmount += goal.remainingAmount;
      summary.statusCounts[goal.status] += 1;

      return summary;
    },
    {
      goalCount: 0,
      totalTargetAmount: 0,
      totalSavedAmount: 0,
      totalRemainingAmount: 0,
      statusCounts: {
        IN_PROGRESS: 0,
        COMPLETED: 0,
        CANCELLED: 0
      },
      averageProgressPercentage: 0
    }
  );

  return {
    ...totals,
    averageProgressPercentage:
      totals.totalTargetAmount > 0 ? (totals.totalSavedAmount / totals.totalTargetAmount) * 100 : 0
  };
}

function getInclusiveDayRange(startDate: Date, endDate: Date): ExclusiveDateRange {
  return {
    startDate: startOfUtcDay(startDate),
    endDate: addUtcDays(startOfUtcDay(endDate), 1)
  };
}

function getMonthsBetween(startDate: Date, endDate: Date) {
  const months: Array<{ month: number; year: number }> = [];
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const finalMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));

  while (cursor <= finalMonth) {
    months.push({
      month: cursor.getUTCMonth() + 1,
      year: cursor.getUTCFullYear()
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
