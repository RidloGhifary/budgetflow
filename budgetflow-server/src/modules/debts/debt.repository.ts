import { DebtStatus, Prisma, type DebtType, type PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { DebtQueryInput } from "./debt.validators";

const debtListInclude = {
  _count: {
    select: {
      payments: true
    }
  }
} satisfies Prisma.DebtInclude;

const debtPaymentInclude = {
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
} satisfies Prisma.DebtPaymentInclude;

const debtDetailInclude = {
  payments: {
    include: debtPaymentInclude,
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }]
  }
} satisfies Prisma.DebtInclude;

export type DbClient = Prisma.TransactionClient | PrismaClient;

export type DebtWithPaymentCount = Prisma.DebtGetPayload<{
  include: typeof debtListInclude;
}>;

export type DebtWithPayments = Prisma.DebtGetPayload<{
  include: typeof debtDetailInclude;
}>;

export type DebtPaymentWithTransaction = Prisma.DebtPaymentGetPayload<{
  include: typeof debtPaymentInclude;
}>;

interface CreateDebtData {
  userId: string;
  type: DebtType;
  title: string;
  personName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: Date | null;
  status: DebtStatus;
  note?: string | null;
}

interface UpdateDebtData {
  type: DebtType;
  title: string;
  personName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: Date | null;
  status: DebtStatus;
  note?: string | null;
}

interface CreateDebtPaymentData {
  userId: string;
  debtId: string;
  transactionId: string;
  amount: number;
  paymentDate: Date;
  note?: string | null;
}

export function findDebts(userId: string, filters: DebtQueryInput, client: DbClient = prisma) {
  return client.debt.findMany({
    where: buildDebtWhere(userId, filters),
    include: debtListInclude,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
  });
}

export function findDebtById(userId: string, id: string, client: DbClient = prisma) {
  return client.debt.findFirst({
    where: {
      id,
      userId
    },
    include: debtListInclude
  });
}

export function findDebtDetailById(userId: string, id: string, client: DbClient = prisma) {
  return client.debt.findFirst({
    where: {
      id,
      userId
    },
    include: debtDetailInclude
  });
}

export function createDebt(data: CreateDebtData, client: DbClient = prisma) {
  return client.debt.create({
    data,
    include: debtListInclude
  });
}

export function updateDebt(id: string, data: UpdateDebtData, client: DbClient = prisma) {
  return client.debt.update({
    where: {
      id
    },
    data,
    include: debtListInclude
  });
}

export function deleteDebt(id: string, client: DbClient = prisma) {
  return client.debt.delete({
    where: {
      id
    }
  });
}

export function createDebtPayment(data: CreateDebtPaymentData, client: DbClient = prisma) {
  return client.debtPayment.create({
    data,
    include: debtPaymentInclude
  });
}

export function getRemainingTotalsByType(userId: string, client: DbClient = prisma) {
  return client.debt.groupBy({
    by: ["type"],
    where: {
      userId
    },
    _sum: {
      remainingAmount: true
    }
  });
}

export function getDebtCountsByStatus(userId: string, client: DbClient = prisma) {
  return client.debt.groupBy({
    by: ["status"],
    where: {
      userId
    },
    _count: {
      _all: true
    }
  });
}

export function countDueSoonDebts(userId: string, startDate: Date, endDate: Date, client: DbClient = prisma) {
  return client.debt.count({
    where: {
      userId,
      status: {
        not: DebtStatus.PAID
      },
      dueDate: {
        gte: startDate,
        lt: endDate
      }
    }
  });
}

export function countOverdueDebts(userId: string, today: Date, client: DbClient = prisma) {
  return client.debt.count({
    where: {
      userId,
      status: {
        not: DebtStatus.PAID
      },
      dueDate: {
        lt: today
      }
    }
  });
}

export function findRecentDebtPayments(userId: string, client: DbClient = prisma) {
  return client.debtPayment.findMany({
    where: {
      userId
    },
    include: debtPaymentInclude,
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    take: 5
  });
}

export function findUpcomingDueDebts(userId: string, today: Date, client: DbClient = prisma) {
  return client.debt.findMany({
    where: {
      userId,
      status: {
        not: DebtStatus.PAID
      },
      dueDate: {
        gte: today
      }
    },
    include: debtListInclude,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 5
  });
}

function buildDebtWhere(userId: string, filters: DebtQueryInput): Prisma.DebtWhereInput {
  const andFilters: Prisma.DebtWhereInput[] = [{ userId }];

  if (filters.type) {
    andFilters.push({ type: filters.type });
  }

  if (filters.status) {
    andFilters.push({ status: filters.status });
  }

  if (filters.dueBefore || filters.dueAfter) {
    andFilters.push({
      dueDate: {
        ...(filters.dueAfter ? { gte: filters.dueAfter } : {}),
        ...(filters.dueBefore ? { lte: endOfDay(filters.dueBefore) } : {})
      }
    });
  }

  if (filters.search) {
    andFilters.push({
      OR: [
        {
          title: {
            contains: filters.search,
            mode: "insensitive"
          }
        },
        {
          personName: {
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
