import type { Wallet } from "@prisma/client";

export function toWalletResponse(wallet: Wallet) {
  return {
    id: wallet.id,
    userId: wallet.userId,
    name: wallet.name,
    type: wallet.type,
    initialBalance: Number(wallet.initialBalance),
    currentBalance: Number(wallet.currentBalance),
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt
  };
}
