import type { TransactionWithRelations } from "./transaction.repository";

export function toTransactionResponse(transaction: TransactionWithRelations) {
  return {
    id: transaction.id,
    userId: transaction.userId,
    walletId: transaction.walletId,
    categoryId: transaction.categoryId,
    recurringTransactionId: transaction.recurringTransactionId,
    type: transaction.type,
    purpose: transaction.purpose,
    amount: Number(transaction.amount),
    transactionDate: transaction.transactionDate,
    note: transaction.note,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    wallet: {
      id: transaction.wallet.id,
      name: transaction.wallet.name,
      type: transaction.wallet.type,
      currentBalance: Number(transaction.wallet.currentBalance)
    },
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      type: transaction.category.type,
      icon: transaction.category.icon,
      color: transaction.category.color
    }
  };
}
