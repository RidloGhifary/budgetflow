import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate-request";
import {
  exportBudgetReportController,
  exportDebtReportController,
  exportMonthlyReportController,
  exportSavingGoalReportController,
  exportTransactionReportController,
  getBudgetReportController,
  getDebtReportController,
  getMonthlyReportController,
  getRangeReportController,
  getSavingGoalReportController,
  getTransactionReportController
} from "./report.controller";
import {
  budgetExportQuerySchema,
  budgetReportQuerySchema,
  debtExportQuerySchema,
  debtReportQuerySchema,
  monthlyExportQuerySchema,
  monthlyReportQuerySchema,
  rangeReportQuerySchema,
  savingGoalExportQuerySchema,
  savingGoalReportQuerySchema,
  transactionExportQuerySchema,
  transactionReportQuerySchema
} from "./report.validators";

export const reportRouter = Router();

reportRouter.use(requireAuth);

reportRouter.get("/monthly/export", validateQuery(monthlyExportQuerySchema), exportMonthlyReportController);
reportRouter.get("/transactions/export", validateQuery(transactionExportQuerySchema), exportTransactionReportController);
reportRouter.get("/budgets/export", validateQuery(budgetExportQuerySchema), exportBudgetReportController);
reportRouter.get("/debts/export", validateQuery(debtExportQuerySchema), exportDebtReportController);
reportRouter.get("/goals/export", validateQuery(savingGoalExportQuerySchema), exportSavingGoalReportController);

reportRouter.get("/monthly", validateQuery(monthlyReportQuerySchema), getMonthlyReportController);
reportRouter.get("/range", validateQuery(rangeReportQuerySchema), getRangeReportController);
reportRouter.get("/transactions", validateQuery(transactionReportQuerySchema), getTransactionReportController);
reportRouter.get("/budgets", validateQuery(budgetReportQuerySchema), getBudgetReportController);
reportRouter.get("/debts", validateQuery(debtReportQuerySchema), getDebtReportController);
reportRouter.get("/goals", validateQuery(savingGoalReportQuerySchema), getSavingGoalReportController);
