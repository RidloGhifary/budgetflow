import type { Prisma, WalletType } from "@prisma/client";

import { prisma } from "../../lib/prisma";

interface WalletFilters {
  userId: string;
  search?: string;
  type?: WalletType;
}

interface CreateWalletData {
  userId: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  currentBalance: number;
}

interface UpdateWalletData {
  name?: string;
  type?: WalletType;
  initialBalance?: number;
  currentBalance?: number;
}

export function findWallets(filters: WalletFilters) {
  const where: Prisma.WalletWhereInput = {
    userId: filters.userId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.search
      ? {
          name: {
            contains: filters.search,
            mode: "insensitive"
          }
        }
      : {})
  };

  return prisma.wallet.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { name: "asc" }]
  });
}

export function findWalletById(userId: string, id: string) {
  return prisma.wallet.findFirst({
    where: {
      id,
      userId
    }
  });
}

export function createWallet(data: CreateWalletData) {
  return prisma.wallet.create({
    data
  });
}

export async function updateWallet(userId: string, id: string, data: UpdateWalletData) {
  await prisma.wallet.updateMany({
    where: {
      id,
      userId
    },
    data
  });

  return findWalletById(userId, id);
}

export function deleteWallet(userId: string, id: string) {
  return prisma.wallet.deleteMany({
    where: {
      id,
      userId
    }
  });
}
