import type { Request } from "express";

import { UnauthorizedError } from "./app-error";

export function getAuthenticatedUserId(req: Request) {
  if (!req.auth?.userId) {
    throw new UnauthorizedError();
  }

  return req.auth.userId;
}
