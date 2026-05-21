import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate-request";
import {
  addSavingContribution,
  createGoal,
  deleteGoal,
  getGoal,
  getGoals,
  getGoalSummaryController,
  updateGoal
} from "./goal.controller";
import {
  addSavingContributionSchema,
  createGoalSchema,
  goalQuerySchema,
  updateGoalSchema
} from "./goal.validators";

export const goalRouter = Router();

goalRouter.use(requireAuth);

goalRouter.get("/summary", getGoalSummaryController);
goalRouter.get("/", validateQuery(goalQuerySchema), getGoals);
goalRouter.post("/", validateBody(createGoalSchema), createGoal);
goalRouter.post("/:id/contributions", validateBody(addSavingContributionSchema), addSavingContribution);
goalRouter.get("/:id", getGoal);
goalRouter.patch("/:id", validateBody(updateGoalSchema), updateGoal);
goalRouter.delete("/:id", deleteGoal);
