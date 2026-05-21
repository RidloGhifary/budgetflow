import { Prisma, SavingGoalStatus, type PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { GoalQueryInput } from "./goal.validators";

const goalListInclude = {
  _count: {
    select: {
      contributions: true
    }
  }
} satisfies Prisma.SavingGoalInclude;

const savingContributionInclude = {
  transaction: {
    select: {
      id: true,
      walletId: true,
      categoryId: true,
      type: true,
      purpose: true,
      amount: true,
      transactionDate: true,
      note: true,
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
    }
  }
} satisfies Prisma.SavingContributionInclude;

const goalDetailInclude = {
  contributions: {
    include: savingContributionInclude,
    orderBy: [{ contributionDate: "desc" }, { createdAt: "desc" }]
  }
} satisfies Prisma.SavingGoalInclude;

export type DbClient = Prisma.TransactionClient | PrismaClient;

export type SavingGoalWithContributionCount = Prisma.SavingGoalGetPayload<{
  include: typeof goalListInclude;
}>;

export type SavingGoalWithContributions = Prisma.SavingGoalGetPayload<{
  include: typeof goalDetailInclude;
}>;

export type SavingContributionWithTransaction = Prisma.SavingContributionGetPayload<{
  include: typeof savingContributionInclude;
}>;

interface CreateGoalData {
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date | null;
  status: SavingGoalStatus;
  note?: string | null;
}

interface UpdateGoalData {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date | null;
  status: SavingGoalStatus;
  note?: string | null;
}

interface CreateSavingContributionData {
  userId: string;
  savingGoalId: string;
  transactionId: string;
  amount: number;
  contributionDate: Date;
  note?: string | null;
}

export function findGoals(userId: string, filters: GoalQueryInput, client: DbClient = prisma) {
  return client.savingGoal.findMany({
    where: buildGoalWhere(userId, filters),
    include: goalListInclude,
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
  });
}

export function findGoalById(userId: string, id: string, client: DbClient = prisma) {
  return client.savingGoal.findFirst({
    where: {
      id,
      userId
    },
    include: goalListInclude
  });
}

export function findGoalDetailById(userId: string, id: string, client: DbClient = prisma) {
  return client.savingGoal.findFirst({
    where: {
      id,
      userId
    },
    include: goalDetailInclude
  });
}

export function createGoal(data: CreateGoalData, client: DbClient = prisma) {
  return client.savingGoal.create({
    data,
    include: goalListInclude
  });
}

export function updateGoal(id: string, data: UpdateGoalData, client: DbClient = prisma) {
  return client.savingGoal.update({
    where: {
      id
    },
    data,
    include: goalListInclude
  });
}

export function deleteGoal(id: string, client: DbClient = prisma) {
  return client.savingGoal.delete({
    where: {
      id
    }
  });
}

export function createSavingContribution(data: CreateSavingContributionData, client: DbClient = prisma) {
  return client.savingContribution.create({
    data,
    include: savingContributionInclude
  });
}

export function getGoalTotals(userId: string, client: DbClient = prisma) {
  return client.savingGoal.aggregate({
    where: {
      userId
    },
    _sum: {
      targetAmount: true,
      currentAmount: true
    }
  });
}

export function getGoalCountsByStatus(userId: string, client: DbClient = prisma) {
  return client.savingGoal.groupBy({
    by: ["status"],
    where: {
      userId
    },
    _count: {
      _all: true
    }
  });
}

export function countGoalsDueSoon(userId: string, startDate: Date, endDate: Date, client: DbClient = prisma) {
  return client.savingGoal.count({
    where: {
      userId,
      status: SavingGoalStatus.IN_PROGRESS,
      deadline: {
        gte: startDate,
        lt: endDate
      }
    }
  });
}

export function countOverdueGoals(userId: string, today: Date, client: DbClient = prisma) {
  return client.savingGoal.count({
    where: {
      userId,
      status: SavingGoalStatus.IN_PROGRESS,
      deadline: {
        lt: today
      }
    }
  });
}

export function findRecentSavingContributions(userId: string, client: DbClient = prisma) {
  return client.savingContribution.findMany({
    where: {
      userId
    },
    include: savingContributionInclude,
    orderBy: [{ contributionDate: "desc" }, { createdAt: "desc" }],
    take: 5
  });
}

export function findActiveGoals(userId: string, client: DbClient = prisma) {
  return client.savingGoal.findMany({
    where: {
      userId,
      status: SavingGoalStatus.IN_PROGRESS
    },
    include: goalListInclude,
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 5
  });
}

function buildGoalWhere(userId: string, filters: GoalQueryInput): Prisma.SavingGoalWhereInput {
  const andFilters: Prisma.SavingGoalWhereInput[] = [{ userId }];

  if (filters.status) {
    andFilters.push({ status: filters.status });
  }

  if (filters.deadlineBefore || filters.deadlineAfter) {
    andFilters.push({
      deadline: {
        ...(filters.deadlineAfter ? { gte: filters.deadlineAfter } : {}),
        ...(filters.deadlineBefore ? { lte: endOfDay(filters.deadlineBefore) } : {})
      }
    });
  }

  if (filters.search) {
    andFilters.push({
      OR: [
        {
          name: {
            contains: filters.search,
            mode: "insensitive"
          }
        },
        {
          note: {
            contains: filters.search,
            mode: "insensitive"
          }
        }
      ]
    });
  }

  return { AND: andFilters };
}

function endOfDay(date: Date) {
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}
