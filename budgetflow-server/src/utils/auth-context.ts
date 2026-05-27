import type { Request } from "express";

import { UnauthorizedError } from "./app-error";

export function getAuthenticatedUserId(req: Request) {
  if (!req.auth?.userId) {
    throw new UnauthorizedError();
  }

  return req.auth.userId;
}

export function getAuthenticatedSessionId(req: Request) {
  if (!req.auth?.sessionId) {
    throw new UnauthorizedError("Authenticated session was not found");
  }

  return req.auth.sessionId;
}
