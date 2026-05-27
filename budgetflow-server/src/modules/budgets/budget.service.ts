import type { Category } from "@prisma/client";

import { ConflictError, NotFoundError, BadRequestError } from "../../utils/app-error";
import { resolveMonthYear } from "../../utils/date-range";
import { isPrismaUniqueConstraintError } from "../../utils/prisma-error";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { getChangedFields } from "../audit-logs/audit-log.sanitizer";
import { evaluateSmartBudgetNotificationsSafely } from "../smart-notifications/smart-notification.service";
import {
  createBudget,
  deleteBudget,
  findBudgetById,
  findBudgets,
  findBudgetsForMonth,
  findOwnedCategory,
  getNormalExpenseTotalsByCategory,
  updateBudget
} from "./budget.repository";
import { toBudgetResponse, toBudgetUsageResponse } from "./budget.mapper";
import type {
  BudgetQueryInput,
  BudgetSummaryQueryInput,
  CreateBudgetInput,
  UpdateBudgetInput
} from "./budget.validators";

export async function listBudgets(userId: string, filters: BudgetQueryInput) {
  const budgets = await findBudgets(userId, filters);

  return budgets.map(toBudgetResponse);
}

export async function getUserBudget(userId: string, id: string) {
  const budget = await findBudgetById(userId, id);

  if (!budget) {
    throw new NotFoundError("Budget was not found");
  }

  return toBudgetResponse(budget);
}

export async function createUserBudget(userId: string, input: CreateBudgetInput, context?: AuditRequestContext) {
  const category = await getOwnedExpenseCategoryOrThrow(userId, input.categoryId);
  const budget = await createBudget({
    userId,
    categoryId: category.id,
    month: input.month,
    year: input.year,
    limitAmount: input.limitAmount
  }).catch(handleBudgetConflict);
  const snapshot = budgetSnapshot(budget);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.BUDGET_CREATED,
    afterSnapshot: snapshot,
    context,
    entityId: budget.id,
    entityType: AUDIT_ENTITY_TYPES.BUDGET,
    userId
  });

  await evaluateSmartBudgetNotificationsSafely(userId, {
    categoryId: budget.categoryId,
    month: budget.month,
    year: budget.year
  });

  return toBudgetResponse(budget);
}

export async function updateUserBudget(userId: string, id: string, input: UpdateBudgetInput, context?: AuditRequestContext) {
  const budget = await findBudgetById(userId, id);

  if (!budget) {
    throw new NotFoundError("Budget was not found");
  }

  const categoryId = input.categoryId ?? budget.categoryId;
  const category = await getOwnedExpenseCategoryOrThrow(userId, categoryId);
  const updatedBudget = await updateBudget(budget.id, {
    categoryId: category.id,
    month: input.month ?? budget.month,
    year: input.year ?? budget.year,
    limitAmount: input.limitAmount ?? Number(budget.limitAmount)
  }).catch(handleBudgetConflict);
  const beforeSnapshot = budgetSnapshot(budget);
  const afterSnapshot = budgetSnapshot(updatedBudget);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.BUDGET_UPDATED,
    afterSnapshot,
    beforeSnapshot,
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.BUDGET,
    metadata: {
      changedFields: getChangedFields(beforeSnapshot, afterSnapshot)
    },
    userId
  });

  await evaluateSmartBudgetNotificationsSafely(userId, {
    categoryId: updatedBudget.categoryId,
    month: updatedBudget.month,
    year: updatedBudget.year
  });

  return toBudgetResponse(updatedBudget);
}

export async function deleteUserBudget(userId: string, id: string, context?: AuditRequestContext) {
  const budget = await findBudgetById(userId, id);

  if (!budget) {
    throw new NotFoundError("Budget was not found");
  }

  await deleteBudget(budget.id);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.BUDGET_DELETED,
    beforeSnapshot: budgetSnapshot(budget),
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.BUDGET,
    userId
  });
}

export async function getBudgetSummary(userId: string, input: BudgetSummaryQueryInput) {
  const { month, year } = resolveMonthYear(input);

  return calculateBudgetSummary(userId, month, year);
}

export async function calculateBudgetSummary(userId: string, month: number, year: number) {
  const budgets = await findBudgetsForMonth(userId, month, year);
  const categoryIds = budgets.map((budget) => budget.categoryId);
  const usedAmountByCategory = await getNormalExpenseTotalsByCategory(userId, categoryIds, month, year);
  const items = budgets.map((budget) => toBudgetUsageResponse(budget, usedAmountByCategory.get(budget.categoryId) ?? 0));
  const totalLimitAmount = items.reduce((total, item) => total + item.limitAmount, 0);
  const totalUsedAmount = items.reduce((total, item) => total + item.usedAmount, 0);
  const totalRemainingAmount = totalLimitAmount - totalUsedAmount;
  const overallUsagePercentage = totalLimitAmount > 0 ? (totalUsedAmount / totalLimitAmount) * 100 : 0;

  return {
    month,
    year,
    totalLimitAmount,
    totalUsedAmount,
    totalRemainingAmount,
    overallUsagePercentage,
    safeBudgetCount: items.filter((item) => item.status === "SAFE").length,
    warningBudgetCount: items.filter((item) => item.status === "WARNING").length,
    overBudgetCount: items.filter((item) => item.status === "OVER_BUDGET").length,
    items
  };
}

async function getOwnedExpenseCategoryOrThrow(userId: string, categoryId: string) {
  const category = await findOwnedCategory(userId, categoryId);

  if (!category) {
    throw new NotFoundError("Category was not found");
  }

  assertExpenseCategory(category);

  return category;
}

function assertExpenseCategory(category: Category) {
  if (category.type !== "EXPENSE") {
    throw new BadRequestError("Budgets can only be created for expense categories");
  }
}

function handleBudgetConflict(error: unknown): never {
  if (isPrismaUniqueConstraintError(error)) {
    throw new ConflictError("Budget already exists for this category, month, and year");
  }

  throw error;
}

function budgetSnapshot(budget: {
  categoryId: string;
  id: string;
  limitAmount: unknown;
  month: number;
  year: number;
}) {
  return {
    categoryId: budget.categoryId,
    id: budget.id,
    limitAmount: Number(budget.limitAmount),
    month: budget.month,
    year: budget.year
  };
}
