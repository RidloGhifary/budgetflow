import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate-request";
import {
  getCalendarDayDetail,
  getCalendarSummary
} from "./calendar.controller";
import {
  calendarDayDetailQuerySchema,
  calendarSummaryQuerySchema
} from "./calendar.validators";

export const calendarRouter = Router();

calendarRouter.use(requireAuth);

calendarRouter.get("/summary", validateQuery(calendarSummaryQuerySchema), getCalendarSummary);
calendarRouter.get("/day", validateQuery(calendarDayDetailQuerySchema), getCalendarDayDetail);
