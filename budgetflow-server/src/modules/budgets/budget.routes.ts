import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate-request";
import {
  createBudget,
  deleteBudget,
  getBudget,
  getBudgetSummaryController,
  getBudgets,
  updateBudget
} from "./budget.controller";
import {
  budgetQuerySchema,
  budgetSummaryQuerySchema,
  createBudgetSchema,
  updateBudgetSchema
} from "./budget.validators";

export const budgetRouter = Router();

budgetRouter.use(requireAuth);

budgetRouter.get("/summary", validateQuery(budgetSummaryQuerySchema), getBudgetSummaryController);
budgetRouter.get("/", validateQuery(budgetQuerySchema), getBudgets);
budgetRouter.post("/", validateBody(createBudgetSchema), createBudget);
budgetRouter.get("/:id", getBudget);
budgetRouter.patch("/:id", validateBody(updateBudgetSchema), updateBudget);
budgetRouter.delete("/:id", deleteBudget);
