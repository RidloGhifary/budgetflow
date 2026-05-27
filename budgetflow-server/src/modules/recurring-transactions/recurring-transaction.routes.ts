import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate-request";
import {
  cancelRecurringTransaction,
  createRecurringTransaction,
  generateDueRecurringTransactionsController,
  generateRecurringTransaction,
  getRecurringTransaction,
  getRecurringTransactions,
  pauseRecurringTransaction,
  resumeRecurringTransaction,
  updateRecurringTransaction
} from "./recurring-transaction.controller";
import {
  createRecurringTransactionSchema,
  recurringTransactionQuerySchema,
  updateRecurringTransactionSchema
} from "./recurring-transaction.validators";

export const recurringTransactionRouter = Router();

recurringTransactionRouter.use(requireAuth);

recurringTransactionRouter.get("/", validateQuery(recurringTransactionQuerySchema), getRecurringTransactions);
recurringTransactionRouter.post("/", validateBody(createRecurringTransactionSchema), createRecurringTransaction);
recurringTransactionRouter.post("/generate-due", generateDueRecurringTransactionsController);
recurringTransactionRouter.get("/:id", getRecurringTransaction);
recurringTransactionRouter.patch("/:id", validateBody(updateRecurringTransactionSchema), updateRecurringTransaction);
recurringTransactionRouter.post("/:id/pause", pauseRecurringTransaction);
recurringTransactionRouter.post("/:id/resume", resumeRecurringTransaction);
recurringTransactionRouter.post("/:id/generate", generateRecurringTransaction);
recurringTransactionRouter.delete("/:id", cancelRecurringTransaction);
