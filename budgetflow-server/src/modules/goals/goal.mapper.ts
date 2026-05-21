import type { SavingGoal } from "@prisma/client";

import type {
  SavingContributionWithTransaction,
  SavingGoalWithContributionCount,
  SavingGoalWithContributions
} from "./goal.repository";

type SavingGoalLike = SavingGoal | SavingGoalWithContributionCount;

function toSavingGoalBaseResponse(goal: SavingGoalLike) {
  const targetAmount = Number(goal.targetAmount);
  const currentAmount = Number(goal.currentAmount);
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);

  return {
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    targetAmount,
    currentAmount,
    remainingAmount,
    progressPercentage: targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0,
    deadline: goal.deadline,
    status: goal.status,
    note: goal.note,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt
  };
}

export function toSavingGoalResponse(goal: SavingGoalLike) {
  const response = toSavingGoalBaseResponse(goal);

  if ("_count" in goal) {
    return {
      ...response,
      contributionCount: goal._count.contributions
    };
  }

  return response;
}

export function toSavingGoalDetailResponse(goal: SavingGoalWithContributions) {
  return {
    ...toSavingGoalBaseResponse(goal),
    contributions: goal.contributions.map(toSavingContributionResponse)
  };
}

export function toSavingContributionResponse(contribution: SavingContributionWithTransaction) {
  return {
    id: contribution.id,
    userId: contribution.userId,
    savingGoalId: contribution.savingGoalId,
    transactionId: contribution.transactionId,
    amount: Number(contribution.amount),
    contributionDate: contribution.contributionDate,
    note: contribution.note,
    createdAt: contribution.createdAt,
    updatedAt: contribution.updatedAt,
    transaction: {
      id: contribution.transaction.id,
      walletId: contribution.transaction.walletId,
      categoryId: contribution.transaction.categoryId,
      type: contribution.transaction.type,
      purpose: contribution.transaction.purpose,
      amount: Number(contribution.transaction.amount),
      transactionDate: contribution.transaction.transactionDate,
      note: contribution.transaction.note,
      wallet: {
        id: contribution.transaction.wallet.id,
        name: contribution.transaction.wallet.name,
        type: contribution.transaction.wallet.type,
        currentBalance: Number(contribution.transaction.wallet.currentBalance)
      },
      category: {
        id: contribution.transaction.category.id,
        name: contribution.transaction.category.name,
        type: contribution.transaction.category.type,
        icon: contribution.transaction.category.icon,
        color: contribution.transaction.category.color
      }
    }
  };
}
