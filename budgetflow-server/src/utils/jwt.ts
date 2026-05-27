import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { UnauthorizedError } from "./app-error";

interface AuthTokenPayload {
  sub: string;
  sid?: string;
}

export function signAuthToken(userId: string, sessionId?: string) {
  return jwt.sign({ sub: userId, ...(sessionId ? { sid: sessionId } : {}) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"]
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (typeof payload === "string" || typeof payload.sub !== "string") {
      throw new UnauthorizedError("Invalid authentication token");
    }

    return {
      sub: payload.sub,
      sid: typeof payload.sid === "string" ? payload.sid : undefined
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError("Invalid or expired authentication token");
  }
}
