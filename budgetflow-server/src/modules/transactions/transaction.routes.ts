import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate-request";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  getTransactions,
  updateTransaction
} from "./transaction.controller";
import {
  createTransactionSchema,
  transactionQuerySchema,
  updateTransactionSchema
} from "./transaction.validators";

export const transactionRouter = Router();

transactionRouter.use(requireAuth);

transactionRouter.get("/", validateQuery(transactionQuerySchema), getTransactions);
transactionRouter.post("/", validateBody(createTransactionSchema), createTransaction);
transactionRouter.get("/:id", getTransaction);
transactionRouter.patch("/:id", validateBody(updateTransactionSchema), updateTransaction);
transactionRouter.delete("/:id", deleteTransaction);
