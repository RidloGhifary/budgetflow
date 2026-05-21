import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import {
  createUserTransaction,
  deleteUserTransaction,
  getUserTransaction,
  listTransactions,
  updateUserTransaction
} from "./transaction.service";
import type {
  CreateTransactionInput,
  TransactionQueryInput,
  UpdateTransactionInput
} from "./transaction.validators";

export const getTransactions = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const transactions = await listTransactions(userId, req.query as TransactionQueryInput);

  return sendSuccess(res, {
    message: "Transactions retrieved",
    data: { transactions }
  });
});

export const createTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const transaction = await createUserTransaction(userId, req.body as CreateTransactionInput);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Transaction created",
    data: { transaction }
  });
});

export const getTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const transaction = await getUserTransaction(userId, req.params.id);

  return sendSuccess(res, {
    message: "Transaction retrieved",
    data: { transaction }
  });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const transaction = await updateUserTransaction(userId, req.params.id, req.body as UpdateTransactionInput);

  return sendSuccess(res, {
    message: "Transaction updated",
    data: { transaction }
  });
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  await deleteUserTransaction(userId, req.params.id);

  return sendSuccess(res, {
    message: "Transaction deleted",
    data: null
  });
});
