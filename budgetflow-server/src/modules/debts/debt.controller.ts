import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import {
  createUserDebt,
  deleteUserDebt,
  getDebtSummary,
  getUserDebt,
  listDebts,
  recordUserDebtPayment,
  updateUserDebt
} from "./debt.service";
import type {
  CreateDebtInput,
  DebtQueryInput,
  RecordDebtPaymentInput,
  UpdateDebtInput
} from "./debt.validators";

export const getDebts = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const debts = await listDebts(userId, req.query as DebtQueryInput);

  return sendSuccess(res, {
    message: "Debts retrieved",
    data: { debts }
  });
});

export const createDebt = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const debt = await createUserDebt(userId, req.body as CreateDebtInput);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Debt created",
    data: { debt }
  });
});

export const getDebt = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const debt = await getUserDebt(userId, req.params.id);

  return sendSuccess(res, {
    message: "Debt retrieved",
    data: { debt }
  });
});

export const updateDebt = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const debt = await updateUserDebt(userId, req.params.id, req.body as UpdateDebtInput);

  return sendSuccess(res, {
    message: "Debt updated",
    data: { debt }
  });
});

export const deleteDebt = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  await deleteUserDebt(userId, req.params.id);

  return sendSuccess(res, {
    message: "Debt deleted",
    data: null
  });
});

export const recordDebtPayment = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await recordUserDebtPayment(userId, req.params.id, req.body as RecordDebtPaymentInput);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Debt payment recorded",
    data: result
  });
});

export const getDebtSummaryController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const summary = await getDebtSummary(userId);

  return sendSuccess(res, {
    message: "Debt summary retrieved",
    data: { summary }
  });
});
