import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate-request";
import {
  createDebt,
  deleteDebt,
  getDebt,
  getDebtSummaryController,
  getDebts,
  recordDebtPayment,
  updateDebt
} from "./debt.controller";
import {
  createDebtSchema,
  debtQuerySchema,
  recordDebtPaymentSchema,
  updateDebtSchema
} from "./debt.validators";

export const debtRouter = Router();

debtRouter.use(requireAuth);

debtRouter.get("/summary", getDebtSummaryController);
debtRouter.get("/", validateQuery(debtQuerySchema), getDebts);
debtRouter.post("/", validateBody(createDebtSchema), createDebt);
debtRouter.post("/:id/payments", validateBody(recordDebtPaymentSchema), recordDebtPayment);
debtRouter.get("/:id", getDebt);
debtRouter.patch("/:id", validateBody(updateDebtSchema), updateDebt);
debtRouter.delete("/:id", deleteDebt);
