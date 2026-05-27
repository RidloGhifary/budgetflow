import type {
  FinancialHealthAggregates,
  FinancialHealthComponent,
  FinancialHealthComponentKey,
  FinancialHealthScoreResult,
  FinancialHealthStatus
} from "./financial-health.types";

const componentWeights: Record<FinancialHealthComponentKey, number> = {
  budget_discipline: 20,
  cashflow_health: 30,
  recurring_burden: 15,
  savings_rate: 25,
  spending_stability: 10
};

const componentLabels: Record<FinancialHealthComponentKey, string> = {
  budget_discipline: "Budget Discipline",
  cashflow_health: "Cashflow Health",
  recurring_burden: "Recurring Burden",
  savings_rate: "Savings Rate",
  spending_stability: "Spending Stability"
};

export function calculateFinancialHealthScore(data: FinancialHealthAggregates): FinancialHealthScoreResult {
  const components = [
    calculateCashflowHealth(data),
    calculateSavingsRate(data),
    calculateBudgetDiscipline(data),
    calculateRecurringBurden(data),
    calculateSpendingStability(data)
  ];
  const availableComponents = components.filter((component) => component.available && component.score !== null);
  const totalWeight = availableComponents.reduce((sum, component) => sum + component.weight, 0);
  const weightedScore =
    totalWeight > 0
      ? availableComponents.reduce((sum, component) => sum + (component.score ?? 0) * component.weight, 0) / totalWeight
      : 0;
  const score = clampScore(Math.round(weightedScore));
  const hasEnoughData = availableComponents.length > 0;
  const status = hasEnoughData ? getFinancialHealthStatus(score) : "not_enough_data";

  return {
    components,
    missingMetrics: components.filter((component) => !component.available).map((component) => component.key),
    score,
    status,
    summary: getFinancialHealthSummary(status, hasEnoughData)
  };
}

export function getFinancialHealthStatus(score: number): FinancialHealthStatus {
  if (score >= 90) {
    return "excellent";
  }

  if (score >= 75) {
    return "good";
  }

  if (score >= 60) {
    return "fair";
  }

  if (score >= 40) {
    return "needs_attention";
  }

  return "critical";
}

export function getFinancialHealthSummary(status: FinancialHealthStatus, hasEnoughData: boolean) {
  if (!hasEnoughData) {
    return "Not enough data to calculate your financial health yet.";
  }

  const summaries: Record<FinancialHealthStatus, string> = {
    critical: "Your financial health is under pressure and needs immediate attention.",
    excellent: "Your financial health looks excellent this period.",
    fair: "Your financial health is fair, but some habits may need attention.",
    good: "Your financial health looks good with a few areas to watch.",
    needs_attention: "Your financial health needs attention this period.",
    not_enough_data: "Not enough data to calculate your financial health yet."
  };

  return summaries[status];
}

export function calculateCashflowHealth(data: Pick<FinancialHealthAggregates, "totalExpense" | "totalIncome">) {
  const key = "cashflow_health" satisfies FinancialHealthComponentKey;
  const { totalExpense, totalIncome } = data;

  if (totalIncome <= 0 && totalExpense <= 0) {
    return unavailableComponent(key, "Add income or expense transactions to calculate cashflow health.");
  }

  if (totalIncome <= 0) {
    return availableComponent(key, 5, "Expenses were recorded without income in this period.", {
      expenseToIncomePercentage: null,
      totalExpense,
      totalIncome
    });
  }

  const expenseToIncomePercentage = (totalExpense / totalIncome) * 100;
  const score = scoreCashflowExpenseRatio(totalExpense / totalIncome);

  return availableComponent(
    key,
    score,
    `Expenses used ${formatPercentage(expenseToIncomePercentage)} of income this period.`,
    {
      expenseToIncomePercentage,
      totalExpense,
      totalIncome
    }
  );
}

export function calculateSavingsRate(data: Pick<FinancialHealthAggregates, "netCashflow" | "totalIncome">) {
  const key = "savings_rate" satisfies FinancialHealthComponentKey;

  if (data.totalIncome <= 0) {
    return unavailableComponent(key, "Add income transactions to calculate your savings rate.");
  }

  const savingsRate = data.netCashflow / data.totalIncome;
  const score = scoreSavingsRate(savingsRate);

  return availableComponent(key, score, `You saved ${formatPercentage(savingsRate * 100)} of income this period.`, {
    netCashflow: data.netCashflow,
    savingsRatePercentage: savingsRate * 100,
    totalIncome: data.totalIncome
  });
}

export function calculateBudgetDiscipline(data: Pick<FinancialHealthAggregates, "budgetMetrics">) {
  const key = "budget_discipline" satisfies FinancialHealthComponentKey;

  if (data.budgetMetrics.length === 0) {
    return unavailableComponent(key, "Create budgets to track budget discipline.");
  }

  const budgetScores = data.budgetMetrics.map((budget) => scoreBudgetUsage(budget.usagePercentage));
  const exceededCount = data.budgetMetrics.filter((budget) => budget.usagePercentage > 100).length;
  const nearLimitCount = data.budgetMetrics.filter(
    (budget) => budget.usagePercentage >= 80 && budget.usagePercentage <= 100
  ).length;
  const averageScore = budgetScores.reduce((sum, score) => sum + score, 0) / budgetScores.length;
  const explanation =
    exceededCount > 0
      ? `${exceededCount} budget ${exceededCount === 1 ? "category is" : "categories are"} over the limit.`
      : nearLimitCount > 0
        ? `${nearLimitCount} budget ${nearLimitCount === 1 ? "category is" : "categories are"} near the limit.`
        : "Budgets are under control this period.";

  return availableComponent(key, averageScore, explanation, {
    budgetCount: data.budgetMetrics.length,
    exceededCount,
    nearLimitCount
  });
}

export function calculateRecurringBurden(
  data: Pick<FinancialHealthAggregates, "hasRecurringData" | "recurringExpenseCount" | "recurringExpenseTotal" | "totalIncome">
) {
  const key = "recurring_burden" satisfies FinancialHealthComponentKey;

  if (!data.hasRecurringData || data.recurringExpenseTotal === null || data.recurringExpenseCount === 0) {
    return unavailableComponent(key, "Add recurring transactions and income to calculate recurring burden.");
  }

  if (data.totalIncome <= 0) {
    return unavailableComponent(key, "Add income to compare recurring expenses against income.");
  }

  const recurringBurdenPercentage = (data.recurringExpenseTotal / data.totalIncome) * 100;
  const score = scoreRecurringBurden(recurringBurdenPercentage / 100);

  return availableComponent(
    key,
    score,
    `Recurring expenses used ${formatPercentage(recurringBurdenPercentage)} of income this period.`,
    {
      recurringBurdenPercentage,
      recurringExpenseCount: data.recurringExpenseCount,
      recurringExpenseTotal: data.recurringExpenseTotal,
      totalIncome: data.totalIncome
    }
  );
}

export function calculateSpendingStability(
  data: Pick<FinancialHealthAggregates, "previousExpenseTotal" | "totalExpense">
) {
  const key = "spending_stability" satisfies FinancialHealthComponentKey;

  if (!data.previousExpenseTotal || data.previousExpenseTotal <= 0) {
    return unavailableComponent(key, "Add transactions across multiple periods to compare spending stability.");
  }

  const expenseChangeRate = (data.totalExpense - data.previousExpenseTotal) / data.previousExpenseTotal;
  const score = scoreSpendingStability(expenseChangeRate);
  const direction = expenseChangeRate < 0 ? "decreased" : expenseChangeRate === 0 ? "stayed flat" : "increased";

  return availableComponent(
    key,
    score,
    `Spending ${direction} by ${formatPercentage(Math.abs(expenseChangeRate) * 100)} compared to the previous period.`,
    {
      currentExpenseTotal: data.totalExpense,
      expenseChangePercentage: expenseChangeRate * 100,
      previousExpenseTotal: data.previousExpenseTotal
    }
  );
}

function scoreCashflowExpenseRatio(ratio: number) {
  if (ratio <= 0.5) {
    return 100;
  }

  if (ratio <= 0.8) {
    return 85;
  }

  if (ratio <= 1) {
    return 65;
  }

  if (ratio <= 1.2) {
    return 40;
  }

  return 20;
}

function scoreSavingsRate(rate: number) {
  if (rate >= 0.3) {
    return 100;
  }

  if (rate >= 0.2) {
    return 85;
  }

  if (rate >= 0.1) {
    return 70;
  }

  if (rate >= 0) {
    return 45;
  }

  return 15;
}

function scoreBudgetUsage(usagePercentage: number) {
  if (usagePercentage <= 80) {
    return 100;
  }

  if (usagePercentage <= 100) {
    return 75;
  }

  if (usagePercentage <= 120) {
    return 45;
  }

  return 20;
}

function scoreRecurringBurden(ratio: number) {
  if (ratio <= 0.3) {
    return 100;
  }

  if (ratio <= 0.5) {
    return 75;
  }

  if (ratio <= 0.7) {
    return 45;
  }

  return 15;
}

function scoreSpendingStability(changeRate: number) {
  if (changeRate < 0) {
    return 100;
  }

  if (changeRate <= 0.1) {
    return 85;
  }

  if (changeRate <= 0.25) {
    return 65;
  }

  return 40;
}

function availableComponent(
  key: FinancialHealthComponentKey,
  score: number,
  explanation: string,
  values?: Record<string, number | string | null>
): FinancialHealthComponent {
  return {
    available: true,
    explanation,
    key,
    label: componentLabels[key],
    score: clampScore(Math.round(score)),
    values,
    weight: componentWeights[key]
  };
}

function unavailableComponent(key: FinancialHealthComponentKey, explanation: string): FinancialHealthComponent {
  return {
    available: false,
    explanation,
    key,
    label: componentLabels[key],
    score: null,
    weight: componentWeights[key]
  };
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}
