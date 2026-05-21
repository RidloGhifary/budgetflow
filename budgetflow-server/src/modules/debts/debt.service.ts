import { DebtStatus, DebtType, TransactionPurpose, TransactionType } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { ConflictError, NotFoundError } from "../../utils/app-error";
import { createUserTransactionInTransaction } from "../transactions/transaction.service";
import {
  countDueSoonDebts,
  countOverdueDebts,
  createDebt,
  createDebtPayment,
  deleteDebt,
  findDebtById,
  findDebtDetailById,
  findDebts,
  findRecentDebtPayments,
  findUpcomingDueDebts,
  getDebtCountsByStatus,
  getRemainingTotalsByType,
  updateDebt
} from "./debt.repository";
import {
  toDebtDetailResponse,
  toDebtPaymentResponse,
  toDebtResponse
} from "./debt.mapper";
import type {
  CreateDebtInput,
  DebtQueryInput,
  RecordDebtPaymentInput,
  UpdateDebtInput
} from "./debt.validators";

export async function listDebts(userId: string, filters: DebtQueryInput) {
  const debts = await findDebts(userId, filters);

  return debts.map(toDebtResponse);
}

export async function createUserDebt(userId: string, input: CreateDebtInput) {
  const debt = await createDebt({
    userId,
    type: input.type,
    title: input.title,
    personName: input.personName,
    totalAmount: input.totalAmount,
    paidAmount: 0,
    remainingAmount: input.totalAmount,
    dueDate: input.dueDate ?? null,
    status: DebtStatus.UNPAID,
    note: normalizeNote(input.note)
  });

  return toDebtResponse(debt);
}

export async function getUserDebt(userId: string, id: string) {
  const debt = await findDebtDetailById(userId, id);

  if (!debt) {
    throw new NotFoundError("Debt was not found");
  }

  return toDebtDetailResponse(debt);
}

export async function updateUserDebt(userId: string, id: string, input: UpdateDebtInput) {
  const debt = await findDebtById(userId, id);

  if (!debt) {
    throw new NotFoundError("Debt was not found");
  }

  const paidAmount = Number(debt.paidAmount);
  const totalAmount = roundMoney(input.totalAmount ?? Number(debt.totalAmount));

  if (totalAmount < paidAmount) {
    throw new ConflictError("Total amount cannot be lower than already paid amount");
  }

  const remainingAmount = getRemainingAmount(totalAmount, paidAmount);
  const updatedDebt = await updateDebt(debt.id, {
    type: input.type ?? debt.type,
    title: input.title ?? debt.title,
    personName: input.personName ?? debt.personName,
    totalAmount,
    paidAmount,
    remainingAmount,
    dueDate: input.dueDate === undefined ? debt.dueDate : input.dueDate,
    status: calculateDebtStatus(paidAmount, totalAmount),
    note: input.note === undefined ? debt.note : normalizeNote(input.note)
  });

  return toDebtResponse(updatedDebt);
}

export async function deleteUserDebt(userId: string, id: string) {
  const debt = await findDebtById(userId, id);

  if (!debt) {
    throw new NotFoundError("Debt was not found");
  }

  if (debt._count.payments > 0) {
    throw new ConflictError("Debts with payment history cannot be deleted");
  }

  await deleteDebt(debt.id);
}

export async function recordUserDebtPayment(userId: string, debtId: string, input: RecordDebtPaymentInput) {
  return prisma.$transaction(async (tx) => {
    const debt = await findDebtById(userId, debtId, tx);

    if (!debt) {
      throw new NotFoundError("Debt was not found");
    }

    const remainingAmount = Number(debt.remainingAmount);
    const paymentAmount = roundMoney(input.amount);

    if (debt.status === DebtStatus.PAID || remainingAmount <= 0) {
      throw new ConflictError("Debt is already paid");
    }

    if (paymentAmount > remainingAmount) {
      throw new ConflictError("Payment amount cannot exceed remaining debt amount");
    }

    const transactionKind = getDebtPaymentTransactionKind(debt.type);
    const normalizedNote = normalizeNote(input.note);
    const transaction = await createUserTransactionInTransaction(
      userId,
      {
        walletId: input.walletId,
        categoryId: input.categoryId,
        type: transactionKind.type,
        purpose: transactionKind.purpose,
        amount: paymentAmount,
        transactionDate: input.paymentDate,
        note: normalizedNote ?? getGeneratedPaymentNote(debt.type, debt.title, debt.personName)
      },
      tx
    );
    const payment = await createDebtPayment(
      {
        userId,
        debtId: debt.id,
        transactionId: transaction.id,
        amount: paymentAmount,
        paymentDate: input.paymentDate,
        note: normalizedNote
      },
      tx
    );
    const paidAmount = roundMoney(Number(debt.paidAmount) + paymentAmount);
    const totalAmount = Number(debt.totalAmount);
    const updatedDebt = await updateDebt(
      debt.id,
      {
        type: debt.type,
        title: debt.title,
        personName: debt.personName,
        totalAmount,
        paidAmount,
        remainingAmount: getRemainingAmount(totalAmount, paidAmount),
        dueDate: debt.dueDate,
        status: calculateDebtStatus(paidAmount, totalAmount),
        note: debt.note
      },
      tx
    );

    return {
      debt: toDebtResponse(updatedDebt),
      payment: toDebtPaymentResponse(payment)
    };
  });
}

export async function getDebtSummary(userId: string) {
  const today = startOfTodayUtc();
  const dueSoonEnd = addUtcDays(today, 8);
  const [
    totalsByType,
    countsByStatus,
    dueSoonCount,
    overdueCount,
    recentPayments,
    upcomingDueDebts
  ] = await Promise.all([
    getRemainingTotalsByType(userId),
    getDebtCountsByStatus(userId),
    countDueSoonDebts(userId, today, dueSoonEnd),
    countOverdueDebts(userId, today),
    findRecentDebtPayments(userId),
    findUpcomingDueDebts(userId, today)
  ]);
  const remainingByType = new Map(totalsByType.map((total) => [total.type, Number(total._sum.remainingAmount ?? 0)]));
  const countByStatus = new Map(countsByStatus.map((count) => [count.status, count._count._all]));

  return {
    totalIOweRemainingAmount: remainingByType.get(DebtType.I_OWE) ?? 0,
    totalOwedToMeRemainingAmount: remainingByType.get(DebtType.OWED_TO_ME) ?? 0,
    unpaidDebtCount: countByStatus.get(DebtStatus.UNPAID) ?? 0,
    partialDebtCount: countByStatus.get(DebtStatus.PARTIAL) ?? 0,
    paidDebtCount: countByStatus.get(DebtStatus.PAID) ?? 0,
    dueSoonCount,
    overdueCount,
    recentPayments: recentPayments.map(toDebtPaymentResponse),
    upcomingDueDebts: upcomingDueDebts.map(toDebtResponse)
  };
}

function getDebtPaymentTransactionKind(type: DebtType) {
  if (type === DebtType.I_OWE) {
    return {
      type: TransactionType.EXPENSE,
      purpose: TransactionPurpose.DEBT_PAYMENT
    };
  }

  return {
    type: TransactionType.INCOME,
    purpose: TransactionPurpose.DEBT_COLLECTION
  };
}

function calculateDebtStatus(paidAmount: number, totalAmount: number) {
  if (paidAmount <= 0) {
    return DebtStatus.UNPAID;
  }

  if (paidAmount < totalAmount) {
    return DebtStatus.PARTIAL;
  }

  return DebtStatus.PAID;
}

function getRemainingAmount(totalAmount: number, paidAmount: number) {
  return Math.max(roundMoney(totalAmount - paidAmount), 0);
}

function normalizeNote(note: string | null | undefined) {
  if (note === undefined || note === null) {
    return null;
  }

  const trimmedNote = note.trim();

  return trimmedNote.length > 0 ? trimmedNote : null;
}

function getGeneratedPaymentNote(type: DebtType, title: string, personName: string) {
  const action = type === DebtType.I_OWE ? "Debt payment" : "Debt collection";

  return `${action}: ${title} - ${personName}`;
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
