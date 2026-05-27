import type {
  RecurringTransactionDetail,
  RecurringTransactionWithRelations
} from "./recurring-transaction.repository";
import { toTransactionResponse } from "../transactions/transaction.mapper";

type RecurringTransactionLike = RecurringTransactionWithRelations | RecurringTransactionDetail;

export function toRecurringTransactionResponse(recurringTransaction: RecurringTransactionLike) {
  return {
    id: recurringTransaction.id,
    userId: recurringTransaction.userId,
    walletId: recurringTransaction.walletId,
    categoryId: recurringTransaction.categoryId,
    name: recurringTransaction.name,
    note: recurringTransaction.note,
    type: recurringTransaction.type,
    amount: Number(recurringTransaction.amount),
    frequency: recurringTransaction.frequency,
    interval: recurringTransaction.interval,
    startDate: recurringTransaction.startDate,
    endDate: recurringTransaction.endDate,
    nextRunDate: recurringTransaction.nextRunDate,
    lastRunDate: recurringTransaction.lastRunDate,
    status: recurringTransaction.status,
    autoGenerate: recurringTransaction.autoGenerate,
    totalGeneratedCount: recurringTransaction.totalGeneratedCount,
    cancelledAt: recurringTransaction.cancelledAt,
    createdAt: recurringTransaction.createdAt,
    updatedAt: recurringTransaction.updatedAt,
    wallet: {
      id: recurringTransaction.wallet.id,
      name: recurringTransaction.wallet.name,
      type: recurringTransaction.wallet.type,
      currentBalance: Number(recurringTransaction.wallet.currentBalance)
    },
    category: {
      id: recurringTransaction.category.id,
      name: recurringTransaction.category.name,
      type: recurringTransaction.category.type,
      icon: recurringTransaction.category.icon,
      color: recurringTransaction.category.color
    }
  };
}

export function toRecurringTransactionDetailResponse(recurringTransaction: RecurringTransactionDetail) {
  return {
    ...toRecurringTransactionResponse(recurringTransaction),
    recentGeneratedTransactions: recurringTransaction.occurrences.map((occurrence) => ({
      id: occurrence.id,
      scheduledForDate: occurrence.scheduledForDate,
      generatedAt: occurrence.generatedAt,
      status: occurrence.status,
      errorMessage: occurrence.errorMessage,
      transaction: toTransactionResponse(occurrence.transaction)
    }))
  };
}
