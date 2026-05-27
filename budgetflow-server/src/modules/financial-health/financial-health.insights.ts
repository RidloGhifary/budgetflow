import type {
  FinancialHealthAggregates,
  FinancialHealthInsight,
  FinancialHealthInsightSeverity,
  FinancialHealthInsightType
} from "./financial-health.types";

const typePriority: Record<FinancialHealthInsightType, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  neutral: 3
};

const severityPriority: Record<FinancialHealthInsightSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2
};

export function generateFinancialHealthInsights(data: FinancialHealthAggregates) {
  const insights: FinancialHealthInsight[] = [
    ...getCashflowInsights(data),
    ...getSavingsRateInsights(data),
    ...getBudgetInsights(data),
    ...getRecurringBurdenInsights(data),
    ...getSpendingTrendInsights(data)
  ];

  return insights.sort(compareFinancialHealthInsights);
}

export function compareFinancialHealthInsights(
  first: FinancialHealthInsight,
  second: FinancialHealthInsight
) {
  const typeDifference = typePriority[first.type] - typePriority[second.type];

  if (typeDifference !== 0) {
    return typeDifference;
  }

  const severityDifference = severityPriority[first.severity] - severityPriority[second.severity];

  if (severityDifference !== 0) {
    return severityDifference;
  }

  return first.id.localeCompare(second.id);
}

function getCashflowInsights(data: FinancialHealthAggregates): FinancialHealthInsight[] {
  if (data.totalIncome <= 0 && data.totalExpense <= 0) {
    return [];
  }

  const insights: FinancialHealthInsight[] = [];
  const savingsRate = data.totalIncome > 0 ? data.netCashflow / data.totalIncome : null;

  if (data.totalExpense > data.totalIncome) {
    insights.push({
      action: "Review flexible spending and prioritize required bills first.",
      description: "Expenses are higher than income for this period.",
      id: "cashflow.expenses_above_income",
      relatedMetricKey: "cashflow_health",
      severity: "high",
      supportingValues: {
        netCashflow: data.netCashflow,
        totalExpense: data.totalExpense,
        totalIncome: data.totalIncome
      },
      title: "Expenses are higher than income",
      type: "critical"
    });
  } else if (savingsRate !== null && savingsRate >= 0.2) {
    insights.push({
      action: "Keep this cashflow pattern consistent.",
      description: "Income is covering expenses with a healthy surplus.",
      id: "cashflow.healthy_surplus",
      relatedMetricKey: "cashflow_health",
      severity: "low",
      supportingValues: {
        savingsRatePercentage: savingsRate * 100
      },
      title: "Cashflow is healthy",
      type: "positive"
    });
  }

  return insights;
}

function getSavingsRateInsights(data: FinancialHealthAggregates): FinancialHealthInsight[] {
  if (data.totalIncome <= 0) {
    return [];
  }

  const savingsRate = data.netCashflow / data.totalIncome;

  if (savingsRate < 0) {
    return [
      {
        action: "Look for expenses that can be delayed, reduced, or capped this period.",
        description: "You spent more than you earned in this period.",
        id: "savings_rate.negative",
        relatedMetricKey: "savings_rate",
        severity: "high",
        supportingValues: {
          savingsRatePercentage: savingsRate * 100
        },
        title: "Savings rate is negative",
        type: "critical"
      }
    ];
  }

  if (savingsRate >= 0.2) {
    return [
      {
        action: "Consider assigning part of the surplus to savings goals.",
        description: "Your savings rate is at least 20% of income.",
        id: "savings_rate.healthy",
        relatedMetricKey: "savings_rate",
        severity: "low",
        supportingValues: {
          savingsRatePercentage: savingsRate * 100
        },
        title: "Savings rate looks healthy",
        type: "positive"
      }
    ];
  }

  if (savingsRate >= 0 && savingsRate < 0.1) {
    return [
      {
        action: "Try setting aside income before discretionary spending.",
        description: "Less than 10% of income remained after expenses.",
        id: "savings_rate.low",
        relatedMetricKey: "savings_rate",
        severity: "medium",
        supportingValues: {
          savingsRatePercentage: savingsRate * 100
        },
        title: "Savings rate is quite low",
        type: "warning"
      }
    ];
  }

  return [];
}

function getBudgetInsights(data: FinancialHealthAggregates): FinancialHealthInsight[] {
  if (data.budgetMetrics.length === 0) {
    return [];
  }

  const budgetInsights: FinancialHealthInsight[] = [];

  for (const budget of data.budgetMetrics) {
    if (budget.usagePercentage > 100) {
      budgetInsights.push({
        action: "Review transactions in this category and adjust the budget if the limit is no longer realistic.",
        categoryId: budget.categoryId,
        categoryName: budget.categoryName,
        description: `${budget.categoryName} has exceeded its budget for this period.`,
        id: `budget.exceeded.${budget.categoryId}`,
        relatedMetricKey: "budget_discipline",
        severity: "high",
        supportingValues: {
          limitAmount: budget.limitAmount,
          usedAmount: budget.usedAmount,
          usagePercentage: budget.usagePercentage
        },
        title: `${budget.categoryName} budget exceeded`,
        type: "critical"
      });
      continue;
    }

    if (budget.usagePercentage >= 80) {
      budgetInsights.push({
        action: "Keep an eye on this category before adding more expenses.",
        categoryId: budget.categoryId,
        categoryName: budget.categoryName,
        description: `${budget.categoryName} has reached at least 80% of its budget.`,
        id: `budget.near_limit.${budget.categoryId}`,
        relatedMetricKey: "budget_discipline",
        severity: "medium",
        supportingValues: {
          limitAmount: budget.limitAmount,
          usedAmount: budget.usedAmount,
          usagePercentage: budget.usagePercentage
        },
        title: `${budget.categoryName} budget is near its limit`,
        type: "warning"
      });
    }
  }

  if (budgetInsights.length > 0) {
    return budgetInsights;
  }

  return [
    {
      action: "Keep tracking budgets as new transactions come in.",
      description: "All tracked budgets are below 80% usage.",
      id: "budget.under_control",
      relatedMetricKey: "budget_discipline",
      severity: "low",
      supportingValues: {
        budgetCount: data.budgetMetrics.length
      },
      title: "Budgets are under control",
      type: "positive"
    }
  ];
}

function getRecurringBurdenInsights(data: FinancialHealthAggregates): FinancialHealthInsight[] {
  if (!data.hasRecurringData || data.recurringExpenseTotal === null || data.recurringExpenseCount === 0 || data.totalIncome <= 0) {
    return [];
  }

  const recurringBurden = data.recurringExpenseTotal / data.totalIncome;

  if (recurringBurden > 0.7) {
    return [
      {
        action: "Review subscriptions, fixed bills, and memberships for anything that can be reduced.",
        description: "Recurring expenses consume more than 70% of income.",
        id: "recurring_burden.critical",
        relatedMetricKey: "recurring_burden",
        severity: "high",
        supportingValues: {
          recurringBurdenPercentage: recurringBurden * 100,
          recurringExpenseTotal: data.recurringExpenseTotal
        },
        title: "Recurring expenses are very high",
        type: "critical"
      }
    ];
  }

  if (recurringBurden > 0.5) {
    return [
      {
        action: "Check whether fixed expenses are crowding out flexible spending.",
        description: "Recurring expenses consume more than 50% of income.",
        id: "recurring_burden.warning",
        relatedMetricKey: "recurring_burden",
        severity: "medium",
        supportingValues: {
          recurringBurdenPercentage: recurringBurden * 100,
          recurringExpenseTotal: data.recurringExpenseTotal
        },
        title: "Recurring expenses consume a large share of income",
        type: "warning"
      }
    ];
  }

  return [];
}

function getSpendingTrendInsights(data: FinancialHealthAggregates): FinancialHealthInsight[] {
  if (!data.previousExpenseTotal || data.previousExpenseTotal <= 0) {
    return [];
  }

  const expenseChangeRate = (data.totalExpense - data.previousExpenseTotal) / data.previousExpenseTotal;

  if (expenseChangeRate > 0.25) {
    return [
      {
        action: "Compare current expenses with the previous period to find the categories that moved most.",
        description: "Current expenses increased by more than 25% compared with the previous period.",
        id: "spending_trend.increased_over_25",
        relatedMetricKey: "spending_stability",
        severity: "medium",
        supportingValues: {
          currentExpenseTotal: data.totalExpense,
          expenseChangePercentage: expenseChangeRate * 100,
          previousExpenseTotal: data.previousExpenseTotal
        },
        title: "Spending increased compared to the previous period",
        type: "warning"
      }
    ];
  }

  if (expenseChangeRate < 0) {
    return [
      {
        action: "Keep the lower spending pattern going if it still fits your needs.",
        description: "Current expenses decreased compared with the previous period.",
        id: "spending_trend.decreased",
        relatedMetricKey: "spending_stability",
        severity: "low",
        supportingValues: {
          currentExpenseTotal: data.totalExpense,
          expenseChangePercentage: expenseChangeRate * 100,
          previousExpenseTotal: data.previousExpenseTotal
        },
        title: "Spending decreased compared to the previous period",
        type: "positive"
      }
    ];
  }

  return [];
}
