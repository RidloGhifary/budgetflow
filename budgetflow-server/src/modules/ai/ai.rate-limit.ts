import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";

interface RateLimitBucket {
  dayKey: string;
  dailyCount: number;
  windowCount: number;
  windowResetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export function enforceAiRateLimit(subjectId: string) {
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const existing = buckets.get(subjectId);
  const bucket =
    existing && existing.dayKey === dayKey
      ? existing
      : {
          dayKey,
          dailyCount: 0,
          windowCount: 0,
          windowResetAt: now + env.ai.rateLimitWindowMs
        };

  if (now >= bucket.windowResetAt) {
    bucket.windowCount = 0;
    bucket.windowResetAt = now + env.ai.rateLimitWindowMs;
  }

  if (bucket.dailyCount >= env.ai.dailyLimitPerUser || bucket.windowCount >= env.ai.rateLimitMaxRequests) {
    buckets.set(subjectId, bucket);
    throw new AppError(429, "You have reached the AI usage limit. Please try again later.", "AI_RATE_LIMITED");
  }

  bucket.dailyCount += 1;
  bucket.windowCount += 1;
  buckets.set(subjectId, bucket);

  return {
    remainingDaily: Math.max(env.ai.dailyLimitPerUser - bucket.dailyCount, 0),
    remainingWindow: Math.max(env.ai.rateLimitMaxRequests - bucket.windowCount, 0),
    windowResetAt: new Date(bucket.windowResetAt).toISOString()
  };
}
