import assert from "node:assert/strict";
import test from "node:test";

import { generateFinancialHealthInsights } from "./financial-health.insights";
import type { FinancialHealthAggregates } from "./financial-health.types";

const baseAggregates: FinancialHealthAggregates = {
  budgetMetrics: [],
  hasRecurringData: false,
  netCashflow: 0,
  previousExpenseTotal: null,
  recurringExpenseCount: 0,
  recurringExpenseTotal: null,
  totalExpense: 0,
  totalIncome: 0
};

test("generates deterministic insight IDs for the same input", () => {
  const input = {
    ...baseAggregates,
    budgetMetrics: [budget("food", "Food", 110)],
    netCashflow: -100,
    totalExpense: 1100,
    totalIncome: 1000
  };
  const first = generateFinancialHealthInsights(input).map((insight) => insight.id);
  const second = generateFinancialHealthInsights(input).map((insight) => insight.id);

  assert.deepEqual(first, second);
  assert.ok(first.includes("budget.exceeded.food"));
});

test("sorts critical insights before warnings and positives by severity and id", () => {
  const insights = generateFinancialHealthInsights({
    ...baseAggregates,
    budgetMetrics: [budget("food", "Food", 110), budget("transport", "Transport", 90)],
    hasRecurringData: true,
    netCashflow: -200,
    previousExpenseTotal: 1500,
    recurringExpenseCount: 1,
    recurringExpenseTotal: 600,
    totalExpense: 1200,
    totalIncome: 1000
  });
  const orderedIds = insights.map((insight) => insight.id);

  assert.ok(orderedIds.indexOf("cashflow.expenses_above_income") < orderedIds.indexOf("recurring_burden.warning"));
  assert.ok(orderedIds.indexOf("savings_rate.negative") < orderedIds.indexOf("spending_trend.decreased"));
});

test("creates budget insights for over-budget and near-limit categories", () => {
  const insights = generateFinancialHealthInsights({
    ...baseAggregates,
    budgetMetrics: [budget("food", "Food", 101), budget("transport", "Transport", 80)]
  });

  assert.equal(insights.find((insight) => insight.id === "budget.exceeded.food")?.type, "critical");
  assert.equal(insights.find((insight) => insight.id === "budget.near_limit.transport")?.type, "warning");
});

test("creates a positive budget insight when all budgets are under control", () => {
  const insights = generateFinancialHealthInsights({
    ...baseAggregates,
    budgetMetrics: [budget("food", "Food", 50)]
  });

  assert.equal(insights[0]?.id, "budget.under_control");
});

test("creates savings insights and avoids misleading missing-data insights", () => {
  assert.equal(generateFinancialHealthInsights(baseAggregates).length, 0);

  const healthy = generateFinancialHealthInsights({
    ...baseAggregates,
    netCashflow: 250,
    totalExpense: 750,
    totalIncome: 1000
  });
  const low = generateFinancialHealthInsights({
    ...baseAggregates,
    netCashflow: 50,
    totalExpense: 950,
    totalIncome: 1000
  });
  const negative = generateFinancialHealthInsights({
    ...baseAggregates,
    netCashflow: -50,
    totalExpense: 1050,
    totalIncome: 1000
  });

  assert.ok(healthy.some((insight) => insight.id === "savings_rate.healthy" && insight.type === "positive"));
  assert.ok(low.some((insight) => insight.id === "savings_rate.low" && insight.type === "warning"));
  assert.ok(negative.some((insight) => insight.id === "savings_rate.negative" && insight.type === "critical"));
});

test("creates recurring burden warning or critical insight, but not both", () => {
  const warning = generateFinancialHealthInsights({
    ...baseAggregates,
    hasRecurringData: true,
    recurringExpenseCount: 1,
    recurringExpenseTotal: 600,
    totalIncome: 1000
  });
  const critical = generateFinancialHealthInsights({
    ...baseAggregates,
    hasRecurringData: true,
    recurringExpenseCount: 1,
    recurringExpenseTotal: 800,
    totalIncome: 1000
  });

  assert.ok(warning.some((insight) => insight.id === "recurring_burden.warning"));
  assert.ok(!warning.some((insight) => insight.id === "recurring_burden.critical"));
  assert.ok(critical.some((insight) => insight.id === "recurring_burden.critical"));
  assert.ok(!critical.some((insight) => insight.id === "recurring_burden.warning"));
});

test("creates spending trend insights only when previous data exists", () => {
  const missing = generateFinancialHealthInsights({
    ...baseAggregates,
    previousExpenseTotal: null,
    totalExpense: 1000
  });
  const increased = generateFinancialHealthInsights({
    ...baseAggregates,
    previousExpenseTotal: 1000,
    totalExpense: 1300
  });
  const decreased = generateFinancialHealthInsights({
    ...baseAggregates,
    previousExpenseTotal: 1000,
    totalExpense: 900
  });

  assert.ok(!missing.some((insight) => insight.relatedMetricKey === "spending_stability"));
  assert.ok(increased.some((insight) => insight.id === "spending_trend.increased_over_25" && insight.type === "warning"));
  assert.ok(decreased.some((insight) => insight.id === "spending_trend.decreased" && insight.type === "positive"));
});

function budget(categoryId: string, categoryName: string, usagePercentage: number) {
  return {
    budgetId: `budget-${categoryId}`,
    categoryId,
    categoryName,
    limitAmount: 100,
    usagePercentage,
    usedAmount: usagePercentage
  };
}
