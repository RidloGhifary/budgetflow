import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate-request";
import { getFinancialHealthController } from "./financial-health.controller";
import { financialHealthQuerySchema } from "./financial-health.validators";

export const financialHealthRouter = Router();

financialHealthRouter.use(requireAuth);

financialHealthRouter.get("/", validateQuery(financialHealthQuerySchema), getFinancialHealthController);
