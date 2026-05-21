import { ConflictError, NotFoundError } from "../../utils/app-error";
import { isPrismaForeignKeyConstraintError, isPrismaUniqueConstraintError } from "../../utils/prisma-error";
import { createWallet, deleteWallet, findWalletById, findWallets, updateWallet } from "./wallet.repository";
import { toWalletResponse } from "./wallet.mapper";
import type { CreateWalletInput, UpdateWalletInput, WalletQueryInput } from "./wallet.validators";

export async function listWallets(userId: string, filters: WalletQueryInput) {
  const wallets = await findWallets({
    userId,
    search: filters.search,
    type: filters.type
  });

  return wallets.map(toWalletResponse);
}

export async function createUserWallet(userId: string, input: CreateWalletInput) {
  const wallet = await createWallet({
    userId,
    name: input.name,
    type: input.type,
    initialBalance: input.initialBalance,
    currentBalance: input.initialBalance
  }).catch(handleWalletConflict);

  return toWalletResponse(wallet);
}

export async function getUserWallet(userId: string, id: string) {
  const wallet = await findWalletById(userId, id);

  if (!wallet) {
    throw new NotFoundError("Wallet was not found");
  }

  return toWalletResponse(wallet);
}

export async function updateUserWallet(userId: string, id: string, input: UpdateWalletInput) {
  const wallet = await findWalletById(userId, id);

  if (!wallet) {
    throw new NotFoundError("Wallet was not found");
  }

  const updatedWallet = await updateWallet(userId, id, {
    name: input.name,
    type: input.type,
    initialBalance: input.initialBalance,
    currentBalance: input.initialBalance
  }).catch(handleWalletConflict);

  if (!updatedWallet) {
    throw new NotFoundError("Wallet was not found");
  }

  return toWalletResponse(updatedWallet);
}

export async function deleteUserWallet(userId: string, id: string) {
  const wallet = await findWalletById(userId, id);

  if (!wallet) {
    throw new NotFoundError("Wallet was not found");
  }

  await deleteWallet(userId, id).catch((error: unknown) => {
    if (isPrismaForeignKeyConstraintError(error)) {
      throw new ConflictError("Wallet cannot be deleted while it has transactions");
    }

    throw error;
  });
}

function handleWalletConflict(error: unknown): never {
  if (isPrismaUniqueConstraintError(error)) {
    throw new ConflictError("Wallet name already exists");
  }

  throw error;
}
