import { SavingGoalStatus, TransactionPurpose, TransactionType } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { ConflictError, NotFoundError } from "../../utils/app-error";
import { createUserTransactionInTransaction } from "../transactions/transaction.service";
import {
  countGoalsDueSoon,
  countOverdueGoals,
  createGoal,
  createSavingContribution,
  deleteGoal,
  findActiveGoals,
  findGoalById,
  findGoalDetailById,
  findGoals,
  findRecentSavingContributions,
  getGoalCountsByStatus,
  getGoalTotals,
  updateGoal
} from "./goal.repository";
import {
  toSavingContributionResponse,
  toSavingGoalDetailResponse,
  toSavingGoalResponse
} from "./goal.mapper";
import type {
  AddSavingContributionInput,
  CreateGoalInput,
  GoalQueryInput,
  UpdateGoalInput
} from "./goal.validators";

export async function listGoals(userId: string, filters: GoalQueryInput) {
  const goals = await findGoals(userId, filters);

  return goals.map(toSavingGoalResponse);
}

export async function createUserGoal(userId: string, input: CreateGoalInput) {
  const goal = await createGoal({
    userId,
    name: input.name,
    targetAmount: input.targetAmount,
    currentAmount: 0,
    deadline: input.deadline ?? null,
    status: SavingGoalStatus.IN_PROGRESS,
    note: normalizeNote(input.note)
  });

  return toSavingGoalResponse(goal);
}

export async function getUserGoal(userId: string, id: string) {
  const goal = await findGoalDetailById(userId, id);

  if (!goal) {
    throw new NotFoundError("Saving goal was not found");
  }

  return toSavingGoalDetailResponse(goal);
}

export async function updateUserGoal(userId: string, id: string, input: UpdateGoalInput) {
  const goal = await findGoalById(userId, id);

  if (!goal) {
    throw new NotFoundError("Saving goal was not found");
  }

  const currentAmount = Number(goal.currentAmount);
  const targetAmount = roundMoney(input.targetAmount ?? Number(goal.targetAmount));
  const status = resolveUpdatedStatus({
    currentAmount,
    targetAmount,
    existingStatus: goal.status,
    requestedStatus: input.status
  });
  const updatedGoal = await updateGoal(goal.id, {
    name: input.name ?? goal.name,
    targetAmount,
    currentAmount,
    deadline: input.deadline === undefined ? goal.deadline : input.deadline,
    status,
    note: input.note === undefined ? goal.note : normalizeNote(input.note)
  });

  return toSavingGoalResponse(updatedGoal);
}

export async function deleteUserGoal(userId: string, id: string) {
  const goal = await findGoalById(userId, id);

  if (!goal) {
    throw new NotFoundError("Saving goal was not found");
  }

  if (goal._count.contributions > 0) {
    throw new ConflictError("Saving goals with contribution history cannot be deleted");
  }

  await deleteGoal(goal.id);
}

export async function addUserSavingContribution(userId: string, goalId: string, input: AddSavingContributionInput) {
  return prisma.$transaction(async (tx) => {
    const goal = await findGoalById(userId, goalId, tx);

    if (!goal) {
      throw new NotFoundError("Saving goal was not found");
    }

    if (goal.status === SavingGoalStatus.CANCELLED) {
      throw new ConflictError("Cannot add contributions to a cancelled saving goal");
    }

    const contributionAmount = roundMoney(input.amount);
    const normalizedNote = normalizeNote(input.note);
    const transaction = await createUserTransactionInTransaction(
      userId,
      {
        walletId: input.walletId,
        categoryId: input.categoryId,
        type: TransactionType.EXPENSE,
        purpose: TransactionPurpose.SAVING_CONTRIBUTION,
        amount: contributionAmount,
        transactionDate: input.contributionDate,
        note: normalizedNote ?? getGeneratedContributionNote(goal.name)
      },
      tx
    );
    const contribution = await createSavingContribution(
      {
        userId,
        savingGoalId: goal.id,
        transactionId: transaction.id,
        amount: contributionAmount,
        contributionDate: input.contributionDate,
        note: normalizedNote
      },
      tx
    );
    const currentAmount = roundMoney(Number(goal.currentAmount) + contributionAmount);
    const targetAmount = Number(goal.targetAmount);
    const updatedGoal = await updateGoal(
      goal.id,
      {
        name: goal.name,
        targetAmount,
        currentAmount,
        deadline: goal.deadline,
        status: calculateGoalStatus(currentAmount, targetAmount),
        note: goal.note
      },
      tx
    );

    return {
      goal: toSavingGoalResponse(updatedGoal),
      contribution: toSavingContributionResponse(contribution)
    };
  });
}

export async function getGoalSummary(userId: string) {
  const today = startOfTodayUtc();
  const dueSoonEnd = addUtcDays(today, 31);
  const [
    totals,
    countsByStatus,
    dueSoonCount,
    overdueCount,
    recentContributions,
    activeGoals
  ] = await Promise.all([
    getGoalTotals(userId),
    getGoalCountsByStatus(userId),
    countGoalsDueSoon(userId, today, dueSoonEnd),
    countOverdueGoals(userId, today),
    findRecentSavingContributions(userId),
    findActiveGoals(userId)
  ]);
  const totalTargetAmount = Number(totals._sum.targetAmount ?? 0);
  const totalSavedAmount = Number(totals._sum.currentAmount ?? 0);
  const totalRemainingAmount = Math.max(totalTargetAmount - totalSavedAmount, 0);
  const countByStatus = new Map(countsByStatus.map((count) => [count.status, count._count._all]));

  return {
    totalTargetAmount,
    totalSavedAmount,
    totalRemainingAmount,
    averageProgressPercentage: totalTargetAmount > 0 ? (totalSavedAmount / totalTargetAmount) * 100 : 0,
    activeGoalsCount: countByStatus.get(SavingGoalStatus.IN_PROGRESS) ?? 0,
    completedGoalsCount: countByStatus.get(SavingGoalStatus.COMPLETED) ?? 0,
    cancelledGoalsCount: countByStatus.get(SavingGoalStatus.CANCELLED) ?? 0,
    dueSoonCount,
    overdueCount,
    recentContributions: recentContributions.map(toSavingContributionResponse),
    activeGoals: activeGoals.map(toSavingGoalResponse)
  };
}

function resolveUpdatedStatus({
  currentAmount,
  existingStatus,
  requestedStatus,
  targetAmount
}: {
  currentAmount: number;
  existingStatus: SavingGoalStatus;
  requestedStatus?: SavingGoalStatus;
  targetAmount: number;
}) {
  if (requestedStatus === SavingGoalStatus.CANCELLED || existingStatus === SavingGoalStatus.CANCELLED) {
    return SavingGoalStatus.CANCELLED;
  }

  return calculateGoalStatus(currentAmount, targetAmount);
}

function calculateGoalStatus(currentAmount: number, targetAmount: number) {
  if (currentAmount >= targetAmount) {
    return SavingGoalStatus.COMPLETED;
  }

  return SavingGoalStatus.IN_PROGRESS;
}

function normalizeNote(note: string | null | undefined) {
  if (note === undefined || note === null) {
    return null;
  }

  const trimmedNote = note.trim();

  return trimmedNote.length > 0 ? trimmedNote : null;
}

function getGeneratedContributionNote(goalName: string) {
  return `Saving contribution: ${goalName}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function startOfTodayUtc() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return today;
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}
