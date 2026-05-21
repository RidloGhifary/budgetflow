import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate-request";
import { getDashboardSummaryController } from "./dashboard.controller";
import { dashboardSummaryQuerySchema } from "./dashboard.validators";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", validateQuery(dashboardSummaryQuerySchema), getDashboardSummaryController);
