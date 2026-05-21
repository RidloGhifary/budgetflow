import type { BudgetWithCategory } from "./budget.repository";

export type BudgetStatus = "SAFE" | "WARNING" | "OVER_BUDGET";

export function toBudgetResponse(budget: BudgetWithCategory) {
  return {
    id: budget.id,
    userId: budget.userId,
    categoryId: budget.categoryId,
    month: budget.month,
    year: budget.year,
    limitAmount: Number(budget.limitAmount),
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
    category: {
      id: budget.category.id,
      name: budget.category.name,
      type: budget.category.type,
      icon: budget.category.icon,
      color: budget.category.color
    }
  };
}

export function getBudgetStatus(usagePercentage: number): BudgetStatus {
  if (usagePercentage > 100) {
    return "OVER_BUDGET";
  }

  if (usagePercentage >= 80) {
    return "WARNING";
  }

  return "SAFE";
}

export function toBudgetUsageResponse(budget: BudgetWithCategory, usedAmount: number) {
  const baseBudget = toBudgetResponse(budget);
  const limitAmount = baseBudget.limitAmount;
  const remainingAmount = limitAmount - usedAmount;
  const usagePercentage = limitAmount > 0 ? (usedAmount / limitAmount) * 100 : 0;
  const overAmount = Math.max(usedAmount - limitAmount, 0);

  return {
    ...baseBudget,
    usedAmount,
    remainingAmount,
    usagePercentage,
    overAmount,
    status: getBudgetStatus(usagePercentage)
  };
}
