import type { NextFunction, Request, Response } from "express";

import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { normalizeEmail } from "./email-policy";

interface RateLimitOptions {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();
const authRateLimitMessage = "Too many attempts. Please wait a few minutes and try again.";

export const registerRateLimiter = createAuthRateLimiter({
  keyPrefix: "auth-register",
  maxRequests: env.auth.registerRateLimitMax,
  windowMs: env.auth.registerRateLimitWindowMs
});

export const loginRateLimiter = createAuthRateLimiter({
  keyPrefix: "auth-login",
  keyGenerator: (req) => `${getClientIp(req)}:${getRequestEmail(req)}`,
  maxRequests: env.auth.loginRateLimitMax,
  windowMs: env.auth.loginRateLimitWindowMs
});

export const twoFactorRateLimiter = createAuthRateLimiter({
  keyPrefix: "auth-2fa",
  keyGenerator: (req) => `${getClientIp(req)}:${getChallengeId(req)}`,
  maxRequests: 8,
  windowMs: 10 * 60 * 1000
});

export const securityConfirmationRateLimiter = createAuthRateLimiter({
  keyPrefix: "security-confirm",
  keyGenerator: (req) => `${getClientIp(req)}:${req.auth?.userId ?? "anonymous"}`,
  maxRequests: 8,
  windowMs: 10 * 60 * 1000
});

export function createAuthRateLimiter(options: RateLimitOptions) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${options.keyGenerator?.(req) ?? getClientIp(req)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });
      return next();
    }

    if (bucket.count >= options.maxRequests) {
      return next(new AppError(429, authRateLimitMessage, "AUTH_RATE_LIMITED"));
    }

    bucket.count += 1;
    return next();
  };
}

function getClientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getRequestEmail(req: Request) {
  const email = typeof req.body?.email === "string" ? normalizeEmail(req.body.email) : "";

  return email || "unknown-email";
}

function getChallengeId(req: Request) {
  return typeof req.body?.challengeId === "string" ? req.body.challengeId : "unknown-challenge";
}
