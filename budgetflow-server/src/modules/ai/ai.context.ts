import { getMonthLabel, resolveMonthYear } from "../../utils/date-range";
import { getDashboardSummary } from "../dashboard/dashboard.service";
import { getDebtSummary } from "../debts/debt.service";
import { getGoalSummary } from "../goals/goal.service";
import type { AiChatInput } from "./ai.validators";

export async function buildDashboardAiContext(userId: string, input: Pick<AiChatInput, "month" | "year">) {
  const { month, year } = resolveMonthYear(input);
  const [dashboard, debtSummary, savingGoalSummary] = await Promise.all([
    getDashboardSummary(userId, { month, year }),
    getDebtSummary(userId),
    getGoalSummary(userId)
  ]);

  return {
    period: {
      month,
      year,
      label: getMonthLabel(month, year)
    },
    financialSummary: dashboard.financialSummary,
    budgetSummary: {
      totalLimitAmount: dashboard.budgetSummary.totalLimitAmount,
      totalUsedAmount: dashboard.budgetSummary.totalUsedAmount,
      totalRemainingAmount: dashboard.budgetSummary.totalRemainingAmount,
      overallUsagePercentage: dashboard.budgetSummary.overallUsagePercentage,
      safeBudgetCount: dashboard.budgetSummary.safeBudgetCount,
      warningBudgetCount: dashboard.budgetSummary.warningBudgetCount,
      overBudgetCount: dashboard.budgetSummary.overBudgetCount
    },
    topExpenseCategory: dashboard.topExpenseCategory,
    overBudgetCategories: dashboard.overBudgetCategories.slice(0, 5),
    expenseByCategory: dashboard.expenseByCategory.slice(0, 8),
    recentTransactions: dashboard.recentTransactions.slice(0, 5).map((transaction) => ({
      type: transaction.type,
      purpose: transaction.purpose,
      amount: transaction.amount,
      transactionDate: transaction.transactionDate,
      categoryName: transaction.category.name,
      walletName: transaction.wallet.name,
      note: transaction.note
    })),
    incomeVsExpense: dashboard.incomeVsExpense,
    debtSummary: {
      totalIOweRemainingAmount: debtSummary.totalIOweRemainingAmount,
      totalOwedToMeRemainingAmount: debtSummary.totalOwedToMeRemainingAmount,
      unpaidDebtCount: debtSummary.unpaidDebtCount,
      partialDebtCount: debtSummary.partialDebtCount,
      paidDebtCount: debtSummary.paidDebtCount,
      dueSoonCount: debtSummary.dueSoonCount,
      overdueCount: debtSummary.overdueCount,
      upcomingDueDebts: debtSummary.upcomingDueDebts.slice(0, 5).map((debt) => ({
        title: debt.title,
        personName: debt.personName,
        type: debt.type,
        remainingAmount: debt.remainingAmount,
        dueDate: debt.dueDate,
        status: debt.status
      }))
    },
    savingGoalSummary: {
      totalTargetAmount: savingGoalSummary.totalTargetAmount,
      totalSavedAmount: savingGoalSummary.totalSavedAmount,
      totalRemainingAmount: savingGoalSummary.totalRemainingAmount,
      averageProgressPercentage: savingGoalSummary.averageProgressPercentage,
      activeGoalsCount: savingGoalSummary.activeGoalsCount,
      completedGoalsCount: savingGoalSummary.completedGoalsCount,
      cancelledGoalsCount: savingGoalSummary.cancelledGoalsCount,
      dueSoonCount: savingGoalSummary.dueSoonCount,
      overdueCount: savingGoalSummary.overdueCount,
      activeGoals: savingGoalSummary.activeGoals.slice(0, 5).map((goal) => ({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        remainingAmount: goal.remainingAmount,
        progressPercentage: goal.progressPercentage,
        deadline: goal.deadline,
        status: goal.status
      }))
    }
  };
}

export type DashboardAiContext = Awaited<ReturnType<typeof buildDashboardAiContext>>;
