import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import { getUserAuditLog, listUserAuditLogs } from "./audit-log.service";
import type { AuditLogQueryInput } from "./audit-log.validators";

export const getAuditLogs = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await listUserAuditLogs(userId, req.query as unknown as AuditLogQueryInput);

  return sendSuccess(res, {
    message: "Audit logs retrieved",
    data: result
  });
});

export const getAuditLog = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const auditLog = await getUserAuditLog(userId, req.params.id);

  return sendSuccess(res, {
    message: "Audit log retrieved",
    data: { auditLog }
  });
});
