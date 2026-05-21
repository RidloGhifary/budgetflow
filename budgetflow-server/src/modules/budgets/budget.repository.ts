import { Prisma, type Category, type PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { getMonthRange } from "../../utils/date-range";
import type { BudgetQueryInput } from "./budget.validators";

const budgetInclude = {
  category: {
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      color: true
    }
  }
} satisfies Prisma.BudgetInclude;

export type BudgetWithCategory = Prisma.BudgetGetPayload<{
  include: typeof budgetInclude;
}>;

type DbClient = Prisma.TransactionClient | PrismaClient;

interface CreateBudgetData {
  userId: string;
  categoryId: string;
  month: number;
  year: number;
  limitAmount: number;
}

interface UpdateBudgetData {
  categoryId: string;
  month: number;
  year: number;
  limitAmount: number;
}

export function findBudgets(userId: string, filters: BudgetQueryInput, client: DbClient = prisma) {
  return client.budget.findMany({
    where: {
      userId,
      ...(filters.month && filters.year ? { month: filters.month, year: filters.year } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {})
    },
    include: budgetInclude,
    orderBy: [{ year: "desc" }, { month: "desc" }, { category: { name: "asc" } }]
  });
}

export function findBudgetsForMonth(userId: string, month: number, year: number, client: DbClient = prisma) {
  return client.budget.findMany({
    where: {
      userId,
      month,
      year
    },
    include: budgetInclude,
    orderBy: [{ category: { name: "asc" } }]
  });
}

export function findBudgetById(userId: string, id: string, client: DbClient = prisma) {
  return client.budget.findFirst({
    where: {
      id,
      userId
    },
    include: budgetInclude
  });
}

export function findOwnedCategory(userId: string, categoryId: string, client: DbClient = prisma): Promise<Category | null> {
  return client.category.findFirst({
    where: {
      id: categoryId,
      userId
    }
  });
}

export function createBudget(data: CreateBudgetData, client: DbClient = prisma) {
  return client.budget.create({
    data,
    include: budgetInclude
  });
}

export function updateBudget(id: string, data: UpdateBudgetData, client: DbClient = prisma) {
  return client.budget.update({
    where: {
      id
    },
    data,
    include: budgetInclude
  });
}

export function deleteBudget(id: string, client: DbClient = prisma) {
  return client.budget.delete({
    where: {
      id
    }
  });
}

export async function getNormalExpenseTotalsByCategory(
  userId: string,
  categoryIds: string[],
  month: number,
  year: number,
  client: DbClient = prisma
) {
  if (categoryIds.length === 0) {
    return new Map<string, number>();
  }

  const range = getMonthRange(month, year);
  const totals = await client.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      categoryId: {
        in: categoryIds
      },
      type: "EXPENSE",
      purpose: "NORMAL",
      transactionDate: {
        gte: range.startDate,
        lt: range.endDate
      }
    },
    _sum: {
      amount: true
    }
  });

  return new Map(totals.map((total) => [total.categoryId, Number(total._sum.amount ?? 0)]));
}
