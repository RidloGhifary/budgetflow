import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import { getAuditRequestContext } from "../audit-logs/audit-log.context";
import {
  cancelUserRecurringTransaction,
  createUserRecurringTransaction,
  generateDueRecurringTransactions,
  generateUserRecurringTransactionNow,
  getUserRecurringTransaction,
  listRecurringTransactions,
  pauseUserRecurringTransaction,
  resumeUserRecurringTransaction,
  updateUserRecurringTransaction
} from "./recurring-transaction.service";
import type {
  CreateRecurringTransactionInput,
  RecurringTransactionQueryInput,
  UpdateRecurringTransactionInput
} from "./recurring-transaction.validators";

export const getRecurringTransactions = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const recurringTransactions = await listRecurringTransactions(userId, req.query as RecurringTransactionQueryInput);

  return sendSuccess(res, {
    message: "Recurring transactions retrieved",
    data: { recurringTransactions }
  });
});

export const createRecurringTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const recurringTransaction = await createUserRecurringTransaction(userId, req.body as CreateRecurringTransactionInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    statusCode: 201,
    message: "Recurring transaction created",
    data: { recurringTransaction }
  });
});

export const getRecurringTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const recurringTransaction = await getUserRecurringTransaction(userId, req.params.id);

  return sendSuccess(res, {
    message: "Recurring transaction retrieved",
    data: { recurringTransaction }
  });
});

export const updateRecurringTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const recurringTransaction = await updateUserRecurringTransaction(
    userId,
    req.params.id,
    req.body as UpdateRecurringTransactionInput,
    getAuditRequestContext(req)
  );

  return sendSuccess(res, {
    message: "Recurring transaction updated",
    data: { recurringTransaction }
  });
});

export const pauseRecurringTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const recurringTransaction = await pauseUserRecurringTransaction(userId, req.params.id, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Recurring transaction paused",
    data: { recurringTransaction }
  });
});

export const resumeRecurringTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const recurringTransaction = await resumeUserRecurringTransaction(userId, req.params.id, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Recurring transaction resumed",
    data: { recurringTransaction }
  });
});

export const cancelRecurringTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const recurringTransaction = await cancelUserRecurringTransaction(userId, req.params.id, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Recurring transaction cancelled",
    data: { recurringTransaction }
  });
});

export const generateRecurringTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await generateUserRecurringTransactionNow(userId, req.params.id, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: result.generated ? "Recurring transaction generated" : "Recurring transaction was already generated",
    data: result
  });
});

export const generateDueRecurringTransactionsController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await generateDueRecurringTransactions(userId, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Due recurring transactions processed",
    data: result
  });
});
