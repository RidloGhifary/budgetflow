import type { Category, RecurringTransaction, RecurringTransactionStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../utils/app-error";
import { isPrismaUniqueConstraintError } from "../../utils/prisma-error";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { getChangedFields } from "../audit-logs/audit-log.sanitizer";
import { NOTIFICATION_ENTITY_TYPES, NOTIFICATION_TYPES } from "../notifications/notification.constants";
import { createUserNotificationSafely } from "../notifications/notification.service";
import {
  evaluateSmartNotificationsForTransactionSafely,
  evaluateSmartRecurringNotificationsForRuleSafely
} from "../smart-notifications/smart-notification.service";
import { createUserTransactionInTransaction } from "../transactions/transaction.service";
import { findOwnedCategory, findOwnedWallet } from "../transactions/transaction.repository";
import {
  getNextRunDate,
  getNextRunDateAfter,
  normalizeScheduleDate
} from "./recurring-transaction.schedule";
import {
  createRecurringOccurrence,
  createRecurringTransaction,
  findDueRecurringTransactions,
  findRecurringTransactionById,
  findRecurringTransactionDetail,
  findRecurringTransactions,
  getUpdatedRecurringTransaction,
  updateRecurringAfterGeneration,
  updateRecurringTransaction
} from "./recurring-transaction.repository";
import {
  toRecurringTransactionDetailResponse,
  toRecurringTransactionResponse
} from "./recurring-transaction.mapper";
import type {
  CreateRecurringTransactionInput,
  RecurringTransactionQueryInput,
  UpdateRecurringTransactionInput
} from "./recurring-transaction.validators";

export async function listRecurringTransactions(userId: string, filters: RecurringTransactionQueryInput) {
  const recurringTransactions = await findRecurringTransactions(userId, filters);

  return recurringTransactions.map(toRecurringTransactionResponse);
}

export async function getUserRecurringTransaction(userId: string, id: string) {
  const recurringTransaction = await findRecurringTransactionDetail(userId, id);

  if (!recurringTransaction) {
    throw new NotFoundError("Recurring transaction was not found");
  }

  return toRecurringTransactionDetailResponse(recurringTransaction);
}

export async function createUserRecurringTransaction(userId: string, input: CreateRecurringTransactionInput, context?: AuditRequestContext) {
  await assertOwnedScheduleReferences(userId, input.walletId, input.categoryId, input.type);

  const schedule = normalizeScheduleInput(input);
  const nextRunDate = getNextRunDate(schedule);
  const recurringTransaction = await createRecurringTransaction({
    ...input,
    ...schedule,
    nextRunDate,
    status: nextRunDate ? "ACTIVE" : "COMPLETED",
    userId
  });
  const response = toRecurringTransactionResponse(recurringTransaction);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.RECURRING_TRANSACTION_CREATED,
    afterSnapshot: recurringTransactionSnapshot(response),
    context,
    entityId: recurringTransaction.id,
    entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION,
    userId
  });

  await evaluateSmartRecurringNotificationsForRuleSafely(userId, recurringTransaction.id);

  return response;
}

export async function updateUserRecurringTransaction(userId: string, id: string, input: UpdateRecurringTransactionInput, context?: AuditRequestContext) {
  const existing = await getMutableRecurringTransaction(userId, id);
  const walletId = input.walletId ?? existing.walletId;
  const categoryId = input.categoryId ?? existing.categoryId;
  const type = input.type ?? existing.type;

  await assertOwnedScheduleReferences(userId, walletId, categoryId, type);

  const mergedSchedule = normalizeScheduleInput({
    endDate: input.endDate === undefined ? existing.endDate : input.endDate,
    frequency: input.frequency ?? existing.frequency,
    interval: input.interval ?? existing.interval,
    startDate: input.startDate ?? existing.startDate
  });
  const nextRunDate = existing.status === "ACTIVE" ? getNextRunDate(mergedSchedule) : existing.nextRunDate;
  const nextStatus = existing.status === "ACTIVE" && !nextRunDate ? "COMPLETED" : existing.status;

  await updateRecurringTransaction(userId, id, {
    ...input,
    walletId,
    categoryId,
    type,
    ...mergedSchedule,
    nextRunDate,
    status: nextStatus
  });

  const updated = await getUpdatedRecurringTransaction(userId, id);

  if (!updated) {
    throw new NotFoundError("Recurring transaction was not found");
  }

  const response = toRecurringTransactionResponse(updated);
  const beforeSnapshot = recurringTransactionSnapshot(toRecurringTransactionResponse(existing));
  const afterSnapshot = recurringTransactionSnapshot(response);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.RECURRING_TRANSACTION_UPDATED,
    afterSnapshot,
    beforeSnapshot,
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION,
    metadata: {
      changedFields: getChangedFields(beforeSnapshot, afterSnapshot)
    },
    userId
  });

  await evaluateSmartRecurringNotificationsForRuleSafely(userId, id);

  return response;
}

export async function pauseUserRecurringTransaction(userId: string, id: string, context?: AuditRequestContext) {
  const recurringTransaction = await getMutableRecurringTransaction(userId, id);

  if (recurringTransaction.status !== "ACTIVE") {
    throw new BadRequestError("Only active recurring transactions can be paused");
  }

  await updateRecurringTransaction(userId, id, { status: "PAUSED" });

  const response = await getUpdatedResponse(userId, id);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.RECURRING_TRANSACTION_PAUSED,
    afterSnapshot: recurringTransactionSnapshot(response),
    beforeSnapshot: recurringTransactionSnapshot(toRecurringTransactionResponse(recurringTransaction)),
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION,
    userId
  });

  return response;
}

export async function resumeUserRecurringTransaction(userId: string, id: string, context?: AuditRequestContext) {
  const recurringTransaction = await findRecurringTransactionById(userId, id);

  if (!recurringTransaction) {
    throw new NotFoundError("Recurring transaction was not found");
  }

  if (recurringTransaction.status !== "PAUSED") {
    throw new BadRequestError("Only paused recurring transactions can be resumed");
  }

  const nextRunDate = getNextRunDate(normalizeScheduleInput(recurringTransaction));

  await updateRecurringTransaction(userId, id, {
    nextRunDate,
    status: nextRunDate ? "ACTIVE" : "COMPLETED"
  });

  const response = await getUpdatedResponse(userId, id);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.RECURRING_TRANSACTION_RESUMED,
    afterSnapshot: recurringTransactionSnapshot(response),
    beforeSnapshot: recurringTransactionSnapshot(toRecurringTransactionResponse(recurringTransaction)),
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION,
    userId
  });

  await evaluateSmartRecurringNotificationsForRuleSafely(userId, id);

  return response;
}

export async function cancelUserRecurringTransaction(userId: string, id: string, context?: AuditRequestContext) {
  const recurringTransaction = await getMutableRecurringTransaction(userId, id);

  if (recurringTransaction.status !== "ACTIVE" && recurringTransaction.status !== "PAUSED") {
    throw new BadRequestError("Only active or paused recurring transactions can be cancelled");
  }

  await updateRecurringTransaction(userId, id, {
    cancelledAt: new Date(),
    nextRunDate: null,
    status: "CANCELLED"
  });

  const response = await getUpdatedResponse(userId, id);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.RECURRING_TRANSACTION_CANCELLED,
    afterSnapshot: recurringTransactionSnapshot(response),
    beforeSnapshot: recurringTransactionSnapshot(toRecurringTransactionResponse(recurringTransaction)),
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION,
    userId
  });

  return response;
}

export async function generateDueRecurringTransactions(userId: string, context?: AuditRequestContext) {
  const dueDate = normalizeScheduleDate(new Date());
  const dueRules = await findDueRecurringTransactions(userId, dueDate);
  const results = [];

  for (const rule of dueRules) {
    results.push(await generateRecurringTransactionOccurrence(userId, rule.id, { context, requireDue: true }));
  }

  return {
    generatedCount: results.filter((result) => result.generated).length,
    skippedCount: results.filter((result) => !result.generated).length,
    results
  };
}

export async function generateUserRecurringTransactionNow(userId: string, id: string, context?: AuditRequestContext) {
  return generateRecurringTransactionOccurrence(userId, id, { context, requireDue: false });
}

async function generateRecurringTransactionOccurrence(
  userId: string,
  id: string,
  options: { context?: AuditRequestContext; requireDue: boolean }
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const recurringTransaction = await findRecurringTransactionById(userId, id, tx);

      if (!recurringTransaction) {
        throw new NotFoundError("Recurring transaction was not found");
      }

      validateCanGenerate(recurringTransaction, options.requireDue);

      const scheduledForDate = normalizeScheduleDate(recurringTransaction.nextRunDate ?? new Date());
      const transaction = await createUserTransactionInTransaction(
        userId,
        {
          amount: Number(recurringTransaction.amount),
          categoryId: recurringTransaction.categoryId,
          note: recurringTransaction.note ?? recurringTransaction.name,
          purpose: "NORMAL",
          recurringTransactionId: recurringTransaction.id,
          transactionDate: scheduledForDate,
          type: recurringTransaction.type,
          walletId: recurringTransaction.walletId
        },
        tx
      );
      const nextRunDate = getNextRunDateAfter(normalizeScheduleInput(recurringTransaction), scheduledForDate);
      const status: RecurringTransactionStatus = nextRunDate ? "ACTIVE" : "COMPLETED";

      await createRecurringOccurrence(
        {
          recurringTransactionId: recurringTransaction.id,
          scheduledForDate,
          transactionId: transaction.id
        },
        tx
      );

      await updateRecurringAfterGeneration(
        recurringTransaction.id,
        {
          nextRunDate,
          scheduledForDate,
          status
        },
        tx
      );

      return {
        generated: true,
        recurringTransactionId: recurringTransaction.id,
        recurringTransactionName: recurringTransaction.name,
        scheduledForDate,
        transaction
      };
    });

    await recordAuditLogSafely({
      action: AUDIT_ACTIONS.RECURRING_TRANSACTION_GENERATED,
      afterSnapshot: {
        recurringTransactionId: result.recurringTransactionId,
        scheduledForDate: result.scheduledForDate,
        transactionId: result.transaction.id
      },
      context: options.context,
      entityId: result.recurringTransactionId,
      entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION,
      metadata: {
        generatedBy: options.requireDue ? "due_processor" : "manual",
        scheduledForDate: result.scheduledForDate,
        transactionId: result.transaction.id
      },
      userId
    });

    await createUserNotificationSafely({
      actionUrl: "/transactions",
      category: "RECURRING_TRANSACTION",
      dedupeKey: `recurring.generated:${result.recurringTransactionId}:${result.scheduledForDate.toISOString().slice(0, 10)}`,
      entityId: result.recurringTransactionId,
      entityType: NOTIFICATION_ENTITY_TYPES.RECURRING_TRANSACTION,
      message: `${result.recurringTransactionName} was generated as a transaction.`,
      metadata: {
        amount: result.transaction.amount,
        generatedTransactionId: result.transaction.id,
        scheduledForDate: result.scheduledForDate
      },
      severity: "SUCCESS",
      title: "Recurring transaction generated",
      type: NOTIFICATION_TYPES.RECURRING_TRANSACTION_GENERATED,
      userId
    });

    await evaluateSmartNotificationsForTransactionSafely(userId, result.transaction);
    await evaluateSmartRecurringNotificationsForRuleSafely(userId, result.recurringTransactionId);

    return result;
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return {
        generated: false,
        recurringTransactionId: id,
        reason: "Occurrence already generated"
      };
    }

    await createUserNotificationSafely({
      actionUrl: "/recurring",
      category: "RECURRING_TRANSACTION",
      dedupeKey: `recurring.failed:${id}:${new Date().toISOString().slice(0, 10)}`,
      entityId: id,
      entityType: NOTIFICATION_ENTITY_TYPES.RECURRING_TRANSACTION,
      message: "BudgetFlow could not generate a recurring transaction.",
      metadata: {
        reason: error instanceof Error ? error.message : "Generation failed"
      },
      severity: "WARNING",
      title: "Recurring transaction failed",
      type: NOTIFICATION_TYPES.RECURRING_TRANSACTION_FAILED,
      userId
    });

    throw error;
  }
}

function recurringTransactionSnapshot(recurringTransaction: ReturnType<typeof toRecurringTransactionResponse>) {
  return {
    amount: recurringTransaction.amount,
    autoGenerate: recurringTransaction.autoGenerate,
    categoryId: recurringTransaction.categoryId,
    endDate: recurringTransaction.endDate,
    frequency: recurringTransaction.frequency,
    id: recurringTransaction.id,
    interval: recurringTransaction.interval,
    lastRunDate: recurringTransaction.lastRunDate,
    name: recurringTransaction.name,
    nextRunDate: recurringTransaction.nextRunDate,
    note: recurringTransaction.note,
    startDate: recurringTransaction.startDate,
    status: recurringTransaction.status,
    totalGeneratedCount: recurringTransaction.totalGeneratedCount,
    type: recurringTransaction.type,
    walletId: recurringTransaction.walletId
  };
}

async function getMutableRecurringTransaction(userId: string, id: string) {
  const recurringTransaction = await findRecurringTransactionById(userId, id);

  if (!recurringTransaction) {
    throw new NotFoundError("Recurring transaction was not found");
  }

  if (recurringTransaction.status === "CANCELLED" || recurringTransaction.status === "COMPLETED") {
    throw new BadRequestError("Cancelled or completed recurring transactions cannot be changed");
  }

  return recurringTransaction;
}

async function getUpdatedResponse(userId: string, id: string) {
  const updated = await getUpdatedRecurringTransaction(userId, id);

  if (!updated) {
    throw new NotFoundError("Recurring transaction was not found");
  }

  return toRecurringTransactionResponse(updated);
}

async function assertOwnedScheduleReferences(userId: string, walletId: string, categoryId: string, type: Category["type"]) {
  const [wallet, category] = await Promise.all([
    findOwnedWallet(userId, walletId),
    findOwnedCategory(userId, categoryId)
  ]);

  if (!wallet) {
    throw new NotFoundError("Wallet was not found");
  }

  if (!category) {
    throw new NotFoundError("Category was not found");
  }

  if (category.type !== type) {
    throw new BadRequestError("Category type must match recurring transaction type");
  }
}

function validateCanGenerate(recurringTransaction: RecurringTransaction, requireDue: boolean) {
  if (recurringTransaction.status !== "ACTIVE") {
    throw new BadRequestError("Only active recurring transactions can generate transactions");
  }

  if (!recurringTransaction.nextRunDate) {
    throw new BadRequestError("Recurring transaction has no next run date");
  }

  if (requireDue && normalizeScheduleDate(recurringTransaction.nextRunDate) > normalizeScheduleDate(new Date())) {
    throw new BadRequestError("Recurring transaction is not due yet");
  }
}

function normalizeScheduleInput(input: {
  endDate?: Date | null;
  frequency: RecurringTransaction["frequency"];
  interval: number;
  startDate: Date;
}) {
  return {
    endDate: input.endDate ? normalizeScheduleDate(input.endDate) : null,
    frequency: input.frequency,
    interval: input.interval,
    startDate: normalizeScheduleDate(input.startDate)
  };
}
