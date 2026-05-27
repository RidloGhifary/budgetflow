import { ConflictError, NotFoundError } from "../../utils/app-error";
import { isPrismaForeignKeyConstraintError, isPrismaUniqueConstraintError } from "../../utils/prisma-error";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { getChangedFields } from "../audit-logs/audit-log.sanitizer";
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

export async function createUserWallet(userId: string, input: CreateWalletInput, context?: AuditRequestContext) {
  const wallet = await createWallet({
    userId,
    name: input.name,
    type: input.type,
    initialBalance: input.initialBalance,
    currentBalance: input.initialBalance
  }).catch(handleWalletConflict);
  const snapshot = walletSnapshot(wallet);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.WALLET_CREATED,
    afterSnapshot: snapshot,
    context,
    entityId: wallet.id,
    entityType: AUDIT_ENTITY_TYPES.WALLET,
    userId
  });

  return toWalletResponse(wallet);
}

export async function getUserWallet(userId: string, id: string) {
  const wallet = await findWalletById(userId, id);

  if (!wallet) {
    throw new NotFoundError("Wallet was not found");
  }

  return toWalletResponse(wallet);
}

export async function updateUserWallet(userId: string, id: string, input: UpdateWalletInput, context?: AuditRequestContext) {
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

  const beforeSnapshot = walletSnapshot(wallet);
  const afterSnapshot = walletSnapshot(updatedWallet);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.WALLET_UPDATED,
    afterSnapshot,
    beforeSnapshot,
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.WALLET,
    metadata: {
      changedFields: getChangedFields(beforeSnapshot, afterSnapshot)
    },
    userId
  });

  return toWalletResponse(updatedWallet);
}

export async function deleteUserWallet(userId: string, id: string, context?: AuditRequestContext) {
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

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.WALLET_DELETED,
    beforeSnapshot: walletSnapshot(wallet),
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.WALLET,
    userId
  });
}

function walletSnapshot(wallet: {
  currentBalance: unknown;
  id: string;
  initialBalance: unknown;
  name: string;
  type: string;
}) {
  return {
    currentBalance: Number(wallet.currentBalance),
    id: wallet.id,
    initialBalance: Number(wallet.initialBalance),
    name: wallet.name,
    type: wallet.type
  };
}

function handleWalletConflict(error: unknown): never {
  if (isPrismaUniqueConstraintError(error)) {
    throw new ConflictError("Wallet name already exists");
  }

  throw error;
}
