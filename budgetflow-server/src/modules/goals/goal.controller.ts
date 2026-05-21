import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import {
  addUserSavingContribution,
  createUserGoal,
  deleteUserGoal,
  getGoalSummary,
  getUserGoal,
  listGoals,
  updateUserGoal
} from "./goal.service";
import type {
  AddSavingContributionInput,
  CreateGoalInput,
  GoalQueryInput,
  UpdateGoalInput
} from "./goal.validators";

export const getGoals = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const goals = await listGoals(userId, req.query as GoalQueryInput);

  return sendSuccess(res, {
    message: "Saving goals retrieved",
    data: { goals }
  });
});

export const createGoal = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const goal = await createUserGoal(userId, req.body as CreateGoalInput);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Saving goal created",
    data: { goal }
  });
});

export const getGoal = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const goal = await getUserGoal(userId, req.params.id);

  return sendSuccess(res, {
    message: "Saving goal retrieved",
    data: { goal }
  });
});

export const updateGoal = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const goal = await updateUserGoal(userId, req.params.id, req.body as UpdateGoalInput);

  return sendSuccess(res, {
    message: "Saving goal updated",
    data: { goal }
  });
});

export const deleteGoal = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  await deleteUserGoal(userId, req.params.id);

  return sendSuccess(res, {
    message: "Saving goal deleted",
    data: null
  });
});

export const addSavingContribution = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await addUserSavingContribution(userId, req.params.id, req.body as AddSavingContributionInput);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Saving contribution added",
    data: result
  });
});

export const getGoalSummaryController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const summary = await getGoalSummary(userId);

  return sendSuccess(res, {
    message: "Saving goal summary retrieved",
    data: { summary }
  });
});
