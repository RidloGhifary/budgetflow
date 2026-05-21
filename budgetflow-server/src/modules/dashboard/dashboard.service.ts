import { prisma } from "../../lib/prisma";
import { getLastMonthRanges, getMonthLabel, getMonthRange, resolveMonthYear } from "../../utils/date-range";
import { calculateBudgetSummary } from "../budgets/budget.service";
import type { DashboardSummaryQueryInput } from "./dashboard.validators";

export async function getDashboardSummary(userId: string, input: DashboardSummaryQueryInput) {
  const { month, year } = resolveMonthYear(input);
  const range = getMonthRange(month, year);
  const [
    financialSummary,
    availableBalance,
    budgetSummary,
    expenseByCategory,
    recentTransactions,
    incomeVsExpense
  ] = await Promise.all([
    getMonthlyFinancialSummary(userId, range.startDate, range.endDate),
    getAvailableBalance(userId),
    calculateBudgetSummary(userId, month, year),
    getExpenseByCategory(userId, range.startDate, range.endDate),
    getRecentTransactions(userId),
    getIncomeVsExpenseTrend(userId, month, year)
  ]);
  const topExpenseCategory = expenseByCategory[0] ?? null;
  const overBudgetCategories = budgetSummary.items
    .filter((item) => item.status === "OVER_BUDGET")
    .map((item) => ({
      budgetId: item.id,
      categoryId: item.categoryId,
      categoryName: item.category.name,
      limitAmount: item.limitAmount,
      usedAmount: item.usedAmount,
      overAmount: item.overAmount,
      usagePercentage: item.usagePercentage
    }));

  return {
    month,
    year,
    financialSummary: {
      ...financialSummary,
      availableBalance,
      netCashFlow: financialSummary.totalIncome - financialSummary.totalExpense
    },
    budgetSummary,
    topExpenseCategory,
    recentTransactions,
    incomeVsExpense,
    expenseByCategory,
    overBudgetCategories
  };
}

async function getMonthlyFinancialSummary(userId: string, startDate: Date, endDate: Date) {
  const totals = await prisma.transaction.groupBy({
    by: ["type", "purpose"],
    where: {
      userId,
      transactionDate: {
        gte: startDate,
        lt: endDate
      }
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

        if (total.purpose === "DEBT_COLLECTION") {
          summary.debtCollections += amount;
        }
      }

      if (total.type === "EXPENSE") {
        summary.totalExpense += amount;

        if (total.purpose === "NORMAL") {
          summary.normalExpense += amount;
        }

        if (total.purpose === "DEBT_PAYMENT") {
          summary.debtPayments += amount;
        }

        if (total.purpose === "SAVING_CONTRIBUTION") {
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
      savingContributions: 0
    }
  );
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

async function getRecentTransactions(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId
    },
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
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: 5
  });

  return transactions.map((transaction) => ({
    id: transaction.id,
    userId: transaction.userId,
    walletId: transaction.walletId,
    categoryId: transaction.categoryId,
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
  }));
}

async function getExpenseByCategory(userId: string, startDate: Date, endDate: Date) {
  const totals = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      purpose: "NORMAL",
      transactionDate: {
        gte: startDate,
        lt: endDate
      }
    },
    _sum: {
      amount: true
    },
    orderBy: {
      _sum: {
        amount: "desc"
      }
    }
  });
  const categoryIds = totals.map((total) => total.categoryId);
  const categories = await prisma.category.findMany({
    where: {
      userId,
      id: {
        in: categoryIds
      }
    },
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      color: true
    }
  });
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const totalNormalExpense = totals.reduce((sum, total) => sum + Number(total._sum.amount ?? 0), 0);

  return totals.map((total) => {
    const amount = Number(total._sum.amount ?? 0);
    const category = categoryById.get(total.categoryId);

    return {
      categoryId: total.categoryId,
      categoryName: category?.name ?? "Unknown category",
      color: category?.color ?? null,
      icon: category?.icon ?? null,
      totalAmount: amount,
      percentage: totalNormalExpense > 0 ? (amount / totalNormalExpense) * 100 : 0
    };
  });
}

async function getIncomeVsExpenseTrend(userId: string, month: number, year: number) {
  const ranges = getLastMonthRanges(month, year, 6);
  const firstRange = ranges[0];
  const lastRange = ranges[ranges.length - 1];
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: firstRange.startDate,
        lt: lastRange.endDate
      }
    },
    select: {
      type: true,
      amount: true,
      transactionDate: true
    }
  });
  const trendByMonth = new Map(
    ranges.map((range) => [
      getMonthLabel(range.month, range.year),
      {
        month: range.month,
        year: range.year,
        label: getMonthLabel(range.month, range.year),
        income: 0,
        expense: 0
      }
    ])
  );

  transactions.forEach((transaction) => {
    const transactionMonth = transaction.transactionDate.getUTCMonth() + 1;
    const transactionYear = transaction.transactionDate.getUTCFullYear();
    const key = getMonthLabel(transactionMonth, transactionYear);
    const bucket = trendByMonth.get(key);

    if (!bucket) {
      return;
    }

    if (transaction.type === "INCOME") {
      bucket.income += Number(transaction.amount);
    } else {
      bucket.expense += Number(transaction.amount);
    }
  });

  return Array.from(trendByMonth.values());
}
