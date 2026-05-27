import type { Request } from "express";

import { getSessionMetadata, type SessionMetadata } from "../../utils/request-metadata";

export interface AuditRequestContext extends SessionMetadata {
  actorUserId?: string;
  correlationId?: string;
  method?: string;
  requestId?: string;
  route?: string;
  sessionId?: string;
}

export function getAuditRequestContext(req: Request): AuditRequestContext {
  return {
    ...getSessionMetadata(req),
    actorUserId: req.auth?.userId,
    correlationId: req.get("x-correlation-id"),
    method: req.method,
    requestId: req.get("x-request-id"),
    route: req.originalUrl,
    sessionId: req.auth?.sessionId
  };
}
