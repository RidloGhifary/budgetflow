import type { Category, TransactionPurpose, TransactionType } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/app-error";
import {
  createTransaction,
  deleteTransaction,
  findDebtPaymentByTransactionId,
  findOwnedCategory,
  findOwnedWallet,
  findSavingContributionByTransactionId,
  findTransactionById,
  findTransactions,
  updateTransaction,
  updateWalletBalance
} from "./transaction.repository";
import type { DbClient } from "./transaction.repository";
import { toTransactionResponse } from "./transaction.mapper";
import type {
  CreateTransactionInput,
  TransactionQueryInput,
  UpdateTransactionInput
} from "./transaction.validators";

export async function listTransactions(userId: string, filters: TransactionQueryInput) {
  const transactions = await findTransactions(userId, filters);

  return transactions.map(toTransactionResponse);
}

export async function getUserTransaction(userId: string, id: string) {
  const transaction = await findTransactionById(userId, id);

  if (!transaction) {
    throw new NotFoundError("Transaction was not found");
  }

  return toTransactionResponse(transaction);
}

export async function createUserTransaction(userId: string, input: CreateTransactionInput) {
  return prisma.$transaction((tx) => createUserTransactionInTransaction(userId, input, tx));
}

export async function createUserTransactionInTransaction(userId: string, input: CreateTransactionInput, tx: DbClient) {
  const wallet = await getOwnedWalletOrThrow(userId, input.walletId, tx);
  const category = await getOwnedCategoryOrThrow(userId, input.categoryId, tx);

  validateTransactionDomain({
    category,
    purpose: input.purpose,
    type: input.type
  });

  await applyWalletImpact({
    userId,
    walletId: wallet.id,
    type: input.type,
    amount: input.amount,
    mode: "apply",
    tx
  });

  const transaction = await createTransaction(
    {
      userId,
      walletId: wallet.id,
      categoryId: category.id,
      type: input.type,
      purpose: input.purpose,
      amount: input.amount,
      transactionDate: input.transactionDate,
      note: normalizeNote(input.note)
    },
    tx
  );

  return toTransactionResponse(transaction);
}

export async function updateUserTransaction(userId: string, id: string, input: UpdateTransactionInput) {
  return prisma.$transaction(async (tx) => {
    const existingTransaction = await findTransactionById(userId, id, tx);

    if (!existingTransaction) {
      throw new NotFoundError("Transaction was not found");
    }

    await assertTransactionIsNotLinkedFinancialRecord(userId, existingTransaction.id, tx, "updated");

    const walletId = input.walletId ?? existingTransaction.walletId;
    const categoryId = input.categoryId ?? existingTransaction.categoryId;
    const type = input.type ?? existingTransaction.type;
    const purpose = input.purpose ?? existingTransaction.purpose;
    const amount = input.amount ?? Number(existingTransaction.amount);
    const transactionDate = input.transactionDate ?? existingTransaction.transactionDate;
    const note = input.note === undefined ? existingTransaction.note : normalizeNote(input.note);

    const wallet = await getOwnedWalletOrThrow(userId, walletId, tx);
    const category = await getOwnedCategoryOrThrow(userId, categoryId, tx);

    validateTransactionDomain({
      category,
      purpose,
      type
    });

    await applyWalletImpact({
      userId,
      walletId: existingTransaction.walletId,
      type: existingTransaction.type,
      amount: Number(existingTransaction.amount),
      mode: "reverse",
      tx
    });

    await applyWalletImpact({
      userId,
      walletId: wallet.id,
      type,
      amount,
      mode: "apply",
      tx
    });

    const updatedTransaction = await updateTransaction(
      existingTransaction.id,
      {
        walletId: wallet.id,
        categoryId: category.id,
        type,
        purpose,
        amount,
        transactionDate,
        note
      },
      tx
    );

    return toTransactionResponse(updatedTransaction);
  });
}

export async function deleteUserTransaction(userId: string, id: string) {
  await prisma.$transaction(async (tx) => {
    const existingTransaction = await findTransactionById(userId, id, tx);

    if (!existingTransaction) {
      throw new NotFoundError("Transaction was not found");
    }

    await assertTransactionIsNotLinkedFinancialRecord(userId, existingTransaction.id, tx, "deleted");

    await applyWalletImpact({
      userId,
      walletId: existingTransaction.walletId,
      type: existingTransaction.type,
      amount: Number(existingTransaction.amount),
      mode: "reverse",
      tx
    });

    await deleteTransaction(existingTransaction.id, tx);
  });
}

async function getOwnedWalletOrThrow(userId: string, walletId: string, tx: DbClient) {
  const wallet = await findOwnedWallet(userId, walletId, tx);

  if (!wallet) {
    throw new NotFoundError("Wallet was not found");
  }

  return wallet;
}

async function getOwnedCategoryOrThrow(userId: string, categoryId: string, tx: DbClient) {
  const category = await findOwnedCategory(userId, categoryId, tx);

  if (!category) {
    throw new NotFoundError("Category was not found");
  }

  return category;
}

async function assertTransactionIsNotLinkedFinancialRecord(
  userId: string,
  transactionId: string,
  tx: DbClient,
  action: "updated" | "deleted"
) {
  const [debtPayment, savingContribution] = await Promise.all([
    findDebtPaymentByTransactionId(userId, transactionId, tx),
    findSavingContributionByTransactionId(userId, transactionId, tx)
  ]);

  if (debtPayment) {
    throw new ConflictError(`Debt payment transactions cannot be ${action} directly`);
  }

  if (savingContribution) {
    throw new ConflictError(`Saving contribution transactions cannot be ${action} directly`);
  }
}

function validateTransactionDomain({
  category,
  purpose,
  type
}: {
  category: Category;
  purpose: TransactionPurpose;
  type: TransactionType;
}) {
  validatePurposeType(purpose, type);

  if (category.type !== type) {
    throw new BadRequestError("Category type must match transaction type");
  }
}

function validatePurposeType(purpose: TransactionPurpose, type: TransactionType) {
  const requiredTypeByPurpose: Partial<Record<TransactionPurpose, TransactionType>> = {
    DEBT_PAYMENT: "EXPENSE",
    DEBT_COLLECTION: "INCOME",
    SAVING_CONTRIBUTION: "EXPENSE"
  };
  const requiredType = requiredTypeByPurpose[purpose];

  if (requiredType && type !== requiredType) {
    throw new BadRequestError(`${formatPurpose(purpose)} transactions must be ${requiredType.toLowerCase()} transactions`);
  }
}

async function applyWalletImpact({
  userId,
  walletId,
  type,
  amount,
  mode,
  tx
}: {
  userId: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  mode: "apply" | "reverse";
  tx: DbClient;
}) {
  const signedAmount = type === "INCOME" ? amount : -amount;
  const delta = mode === "apply" ? signedAmount : -signedAmount;
  const result = await updateWalletBalance(userId, walletId, delta, tx);

  if (result.count === 0) {
    throw new NotFoundError("Wallet was not found");
  }
}

function normalizeNote(note: string | null | undefined) {
  if (note === undefined || note === null) {
    return null;
  }

  const trimmedNote = note.trim();

  return trimmedNote.length > 0 ? trimmedNote : null;
}

function formatPurpose(purpose: TransactionPurpose) {
  return purpose
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
