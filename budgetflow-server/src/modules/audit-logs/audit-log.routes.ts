import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate-request";
import { getAuditLog, getAuditLogs } from "./audit-log.controller";
import { auditLogQuerySchema } from "./audit-log.validators";

export const auditLogRouter = Router();

auditLogRouter.use(requireAuth);

auditLogRouter.get("/", validateQuery(auditLogQuerySchema), getAuditLogs);
auditLogRouter.get("/:id", getAuditLog);
