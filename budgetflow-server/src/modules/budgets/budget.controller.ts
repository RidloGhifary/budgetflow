import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import {
  createUserBudget,
  deleteUserBudget,
  getBudgetSummary,
  getUserBudget,
  listBudgets,
  updateUserBudget
} from "./budget.service";
import type {
  BudgetQueryInput,
  BudgetSummaryQueryInput,
  CreateBudgetInput,
  UpdateBudgetInput
} from "./budget.validators";

export const getBudgets = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const budgets = await listBudgets(userId, req.query as BudgetQueryInput);

  return sendSuccess(res, {
    message: "Budgets retrieved",
    data: { budgets }
  });
});

export const createBudget = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const budget = await createUserBudget(userId, req.body as CreateBudgetInput);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Budget created",
    data: { budget }
  });
});

export const getBudget = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const budget = await getUserBudget(userId, req.params.id);

  return sendSuccess(res, {
    message: "Budget retrieved",
    data: { budget }
  });
});

export const updateBudget = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const budget = await updateUserBudget(userId, req.params.id, req.body as UpdateBudgetInput);

  return sendSuccess(res, {
    message: "Budget updated",
    data: { budget }
  });
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  await deleteUserBudget(userId, req.params.id);

  return sendSuccess(res, {
    message: "Budget deleted",
    data: null
  });
});

export const getBudgetSummaryController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const summary = await getBudgetSummary(userId, req.query as BudgetSummaryQueryInput);

  return sendSuccess(res, {
    message: "Budget summary retrieved",
    data: { summary }
  });
});
