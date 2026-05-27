import type { NextFunction, Request, Response } from "express";

import { createUserSession, getActiveSessionOrThrow } from "../modules/security-sessions/security-session.service";
import { AUTH_COOKIE_NAME, clearAuthCookie, setAuthCookie } from "../utils/cookie";
import { signAuthToken, verifyAuthToken } from "../utils/jwt";
import { UnauthorizedError } from "../utils/app-error";
import { getSessionMetadata } from "../utils/request-metadata";

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

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] ?? getBearerToken(req);

    if (!token) {
      return next(new UnauthorizedError());
    }

    const payload = verifyAuthToken(token);
    const metadata = getSessionMetadata(req);
    let sessionId = payload.sid;

    if (sessionId) {
      await getActiveSessionOrThrow(payload.sub, sessionId, metadata);
    } else {
      const session = await createLegacySessionOrClearCookie(payload.sub, metadata, res);
      sessionId = session.id;
      setAuthCookie(res, signAuthToken(payload.sub, sessionId));
    }

    req.auth = { userId: payload.sub, sessionId };

    return next();
  } catch (error) {
    return next(error);
  }
}

async function createLegacySessionOrClearCookie(
  userId: string,
  metadata: ReturnType<typeof getSessionMetadata>,
  res: Response
) {
  try {
    return await createUserSession(userId, metadata);
  } catch {
    clearAuthCookie(res);
    throw new UnauthorizedError("Session has expired. Please log in again.");
  }
}
