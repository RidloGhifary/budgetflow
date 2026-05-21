import type { NextFunction, Request, Response } from "express";

import { AUTH_COOKIE_NAME } from "../utils/cookie";
import { verifyAuthToken } from "../utils/jwt";
import { UnauthorizedError } from "../utils/app-error";

function getBearerToken(req: Request) {
  const header = req.headers.authorization;

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME] ?? getBearerToken(req);

  if (!token) {
    return next(new UnauthorizedError());
  }

  const payload = verifyAuthToken(token);
  req.auth = { userId: payload.sub };

  return next();
}
