import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBudgetDiscipline,
  calculateCashflowHealth,
  calculateFinancialHealthScore,
  calculateRecurringBurden,
  calculateSavingsRate,
  calculateSpendingStability
} from "./financial-health.calculator";
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

test("scores cashflow health from income and expenses", () => {
  assert.equal(calculateCashflowHealth({ totalExpense: 500, totalIncome: 1000 }).score, 100);
  assert.equal(calculateCashflowHealth({ totalExpense: 1000, totalIncome: 1000 }).score, 65);
  assert.equal(calculateCashflowHealth({ totalExpense: 1100, totalIncome: 1000 }).score, 40);
  assert.equal(calculateCashflowHealth({ totalExpense: 100, totalIncome: 0 }).score, 5);

  const empty = calculateCashflowHealth({ totalExpense: 0, totalIncome: 0 });

  assert.equal(empty.available, false);
  assert.equal(empty.score, null);
});

test("scores savings rate bands", () => {
  assert.equal(calculateSavingsRate({ netCashflow: 300, totalIncome: 1000 }).score, 100);
  assert.equal(calculateSavingsRate({ netCashflow: 250, totalIncome: 1000 }).score, 85);
  assert.equal(calculateSavingsRate({ netCashflow: 150, totalIncome: 1000 }).score, 70);
  assert.equal(calculateSavingsRate({ netCashflow: 50, totalIncome: 1000 }).score, 45);
  assert.equal(calculateSavingsRate({ netCashflow: -100, totalIncome: 1000 }).score, 15);
  assert.equal(calculateSavingsRate({ netCashflow: 0, totalIncome: 0 }).available, false);
});

test("scores budget discipline and skips when there are no budgets", () => {
  assert.equal(calculateBudgetDiscipline({ budgetMetrics: [] }).available, false);
  assert.equal(calculateBudgetDiscipline({ budgetMetrics: [budget("food", 70)] }).score, 100);
  assert.equal(calculateBudgetDiscipline({ budgetMetrics: [budget("food", 90)] }).score, 75);
  assert.equal(calculateBudgetDiscipline({ budgetMetrics: [budget("food", 110)] }).score, 45);
  assert.equal(calculateBudgetDiscipline({ budgetMetrics: [budget("food", 130)] }).score, 20);

  const multiple = calculateBudgetDiscipline({
    budgetMetrics: [budget("food", 110), budget("transport", 130)]
  });

  assert.equal(multiple.available, true);
  assert.equal(multiple.values?.exceededCount, 2);
});

test("scores recurring burden and skips when recurring data is missing", () => {
  assert.equal(
    calculateRecurringBurden({
      hasRecurringData: false,
      recurringExpenseCount: 0,
      recurringExpenseTotal: null,
      totalIncome: 1000
    }).available,
    false
  );
  assert.equal(
    calculateRecurringBurden({
      hasRecurringData: true,
      recurringExpenseCount: 1,
      recurringExpenseTotal: 300,
      totalIncome: 1000
    }).score,
    100
  );
  assert.equal(
    calculateRecurringBurden({
      hasRecurringData: true,
      recurringExpenseCount: 1,
      recurringExpenseTotal: 600,
      totalIncome: 1000
    }).score,
    45
  );
  assert.equal(
    calculateRecurringBurden({
      hasRecurringData: true,
      recurringExpenseCount: 1,
      recurringExpenseTotal: 800,
      totalIncome: 1000
    }).score,
    15
  );
});

test("scores spending stability and skips when previous expense is missing", () => {
  assert.equal(calculateSpendingStability({ previousExpenseTotal: null, totalExpense: 1000 }).available, false);
  assert.equal(calculateSpendingStability({ previousExpenseTotal: 1000, totalExpense: 900 }).score, 100);
  assert.equal(calculateSpendingStability({ previousExpenseTotal: 1000, totalExpense: 1050 }).score, 85);
  assert.equal(calculateSpendingStability({ previousExpenseTotal: 1000, totalExpense: 1300 }).score, 40);
});

test("normalizes weights when metrics are missing", () => {
  const allMetrics = calculateFinancialHealthScore({
    ...baseAggregates,
    budgetMetrics: [budget("food", 70)],
    hasRecurringData: true,
    netCashflow: 400,
    previousExpenseTotal: 800,
    recurringExpenseCount: 1,
    recurringExpenseTotal: 200,
    totalExpense: 600,
    totalIncome: 1000
  });
  const someMetrics = calculateFinancialHealthScore({
    ...baseAggregates,
    netCashflow: 400,
    totalExpense: 600,
    totalIncome: 1000
  });
  const oneMetric = calculateFinancialHealthScore({
    ...baseAggregates,
    totalExpense: 100,
    totalIncome: 0
  });
  const noMetrics = calculateFinancialHealthScore(baseAggregates);
  const expectedMissingMetrics = [
    "cashflow_health",
    "savings_rate",
    "budget_discipline",
    "recurring_burden",
    "spending_stability"
  ];

  assert.equal(allMetrics.components.filter((component) => component.available).length, 5);
  assert.equal(someMetrics.components.filter((component) => component.available).length, 2);
  assert.equal(oneMetric.components.filter((component) => component.available).length, 1);
  assert.equal(noMetrics.score, 0);
  assert.equal(noMetrics.status, "not_enough_data");
  assert.equal(noMetrics.summary, "Not enough data to calculate your financial health yet.");
  assert.deepEqual(noMetrics.missingMetrics, expectedMissingMetrics);
  assert.equal(noMetrics.components.length, 5);
  assert.ok(noMetrics.components.every((component) => !component.available && component.score === null));
  assert.ok(someMetrics.score > 0);
  assert.ok(someMetrics.score <= 100);
});

function budget(categoryId: string, usagePercentage: number) {
  return {
    budgetId: `budget-${categoryId}`,
    categoryId,
    categoryName: categoryId,
    limitAmount: 100,
    usagePercentage,
    usedAmount: usagePercentage
  };
}
