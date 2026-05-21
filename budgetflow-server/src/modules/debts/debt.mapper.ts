import type { Debt } from "@prisma/client";

import type {
  DebtPaymentWithTransaction,
  DebtWithPaymentCount,
  DebtWithPayments
} from "./debt.repository";

type DebtLike = Debt | DebtWithPaymentCount;

function toDebtBaseResponse(debt: DebtLike) {
  return {
    id: debt.id,
    userId: debt.userId,
    type: debt.type,
    title: debt.title,
    personName: debt.personName,
    totalAmount: Number(debt.totalAmount),
    paidAmount: Number(debt.paidAmount),
    remainingAmount: Number(debt.remainingAmount),
    dueDate: debt.dueDate,
    status: debt.status,
    note: debt.note,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt
  };
}

export function toDebtResponse(debt: DebtLike) {
  const response = toDebtBaseResponse(debt);

  if ("_count" in debt) {
    return {
      ...response,
      paymentCount: debt._count.payments
    };
  }

  return response;
}

export function toDebtDetailResponse(debt: DebtWithPayments) {
  return {
    ...toDebtBaseResponse(debt),
    payments: debt.payments.map(toDebtPaymentResponse)
  };
}

export function toDebtPaymentResponse(payment: DebtPaymentWithTransaction) {
  return {
    id: payment.id,
    userId: payment.userId,
    debtId: payment.debtId,
    transactionId: payment.transactionId,
    amount: Number(payment.amount),
    paymentDate: payment.paymentDate,
    note: payment.note,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    transaction: {
      id: payment.transaction.id,
      walletId: payment.transaction.walletId,
      categoryId: payment.transaction.categoryId,
      type: payment.transaction.type,
      purpose: payment.transaction.purpose,
      amount: Number(payment.transaction.amount),
      transactionDate: payment.transaction.transactionDate,
      note: payment.transaction.note,
      wallet: {
        id: payment.transaction.wallet.id,
        name: payment.transaction.wallet.name,
        type: payment.transaction.wallet.type,
        currentBalance: Number(payment.transaction.wallet.currentBalance)
      },
      category: {
        id: payment.transaction.category.id,
        name: payment.transaction.category.name,
        type: payment.transaction.category.type,
        icon: payment.transaction.category.icon,
        color: payment.transaction.category.color
      }
    }
  };
}
