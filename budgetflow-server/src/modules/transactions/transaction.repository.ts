import { Prisma, type Category, type PrismaClient, type TransactionPurpose, type TransactionType, type Wallet } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { TransactionQueryInput } from "./transaction.validators";

const transactionInclude = {
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
} satisfies Prisma.TransactionInclude;

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

export type DbClient = Prisma.TransactionClient | PrismaClient;

interface CreateTransactionData {
  userId: string;
  walletId: string;
  categoryId: string;
  type: TransactionType;
  purpose: TransactionPurpose;
  amount: number;
  transactionDate: Date;
  note?: string | null;
}

interface UpdateTransactionData {
  walletId: string;
  categoryId: string;
  type: TransactionType;
  purpose: TransactionPurpose;
  amount: number;
  transactionDate: Date;
  note?: string | null;
}

export function findTransactions(userId: string, filters: TransactionQueryInput, client: DbClient = prisma) {
  return client.transaction.findMany({
    where: buildTransactionWhere(userId, filters),
    include: transactionInclude,
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }]
  });
}

export function findTransactionById(userId: string, id: string, client: DbClient = prisma) {
  return client.transaction.findFirst({
    where: {
      id,
      userId
    },
    include: transactionInclude
  });
}

export function findDebtPaymentByTransactionId(userId: string, transactionId: string, client: DbClient = prisma) {
  return client.debtPayment.findFirst({
    where: {
      userId,
      transactionId
    },
    select: {
      id: true
    }
  });
}

export function findSavingContributionByTransactionId(userId: string, transactionId: string, client: DbClient = prisma) {
  return client.savingContribution.findFirst({
    where: {
      userId,
      transactionId
    },
    select: {
      id: true
    }
  });
}

export function findOwnedWallet(userId: string, walletId: string, client: DbClient = prisma): Promise<Wallet | null> {
  return client.wallet.findFirst({
    where: {
      id: walletId,
      userId
    }
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

export function createTransaction(data: CreateTransactionData, client: DbClient = prisma) {
  return client.transaction.create({
    data: {
      userId: data.userId,
      walletId: data.walletId,
      categoryId: data.categoryId,
      type: data.type,
      purpose: data.purpose,
      amount: data.amount,
      transactionDate: data.transactionDate,
      note: data.note
    },
    include: transactionInclude
  });
}

export function updateTransaction(id: string, data: UpdateTransactionData, client: DbClient = prisma) {
  return client.transaction.update({
    where: {
      id
    },
    data: {
      walletId: data.walletId,
      categoryId: data.categoryId,
      type: data.type,
      purpose: data.purpose,
      amount: data.amount,
      transactionDate: data.transactionDate,
      note: data.note
    },
    include: transactionInclude
  });
}

export function deleteTransaction(id: string, client: DbClient = prisma) {
  return client.transaction.delete({
    where: {
      id
    }
  });
}

export async function updateWalletBalance(userId: string, walletId: string, delta: number, client: DbClient = prisma) {
  return client.wallet.updateMany({
    where: {
      id: walletId,
      userId
    },
    data: {
      currentBalance: {
        increment: new Prisma.Decimal(delta)
      }
    }
  });
}

function buildTransactionWhere(userId: string, filters: TransactionQueryInput): Prisma.TransactionWhereInput {
  const andFilters: Prisma.TransactionWhereInput[] = [{ userId }];

  if (filters.type) {
    andFilters.push({ type: filters.type });
  }

  if (filters.purpose) {
    andFilters.push({ purpose: filters.purpose });
  }

  if (filters.walletId) {
    andFilters.push({ walletId: filters.walletId });
  }

  if (filters.categoryId) {
    andFilters.push({ categoryId: filters.categoryId });
  }

  if (filters.year) {
    const start = new Date(Date.UTC(filters.year, filters.month ? filters.month - 1 : 0, 1));
    const end = filters.month
      ? new Date(Date.UTC(filters.year, filters.month, 1))
      : new Date(Date.UTC(filters.year + 1, 0, 1));

    andFilters.push({
      transactionDate: {
        gte: start,
        lt: end
      }
    });
  }

  if (filters.startDate || filters.endDate) {
    andFilters.push({
      transactionDate: {
        ...(filters.startDate ? { gte: filters.startDate } : {}),
        ...(filters.endDate ? { lte: endOfDay(filters.endDate) } : {})
      }
    });
  }

  if (filters.search) {
    andFilters.push({
      OR: [
        {
          note: {
            contains: filters.search,
            mode: "insensitive"
          }
        },
        {
          wallet: {
            name: {
              contains: filters.search,
              mode: "insensitive"
            }
          }
        },
        {
          category: {
            name: {
              contains: filters.search,
              mode: "insensitive"
            }
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
