import "dotenv/config";
import path from "node:path";

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(6000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  AI_PROVIDER: z.enum(["mock", "http"]).default("mock"),
  AI_BASE_URL: z.string().optional().default(""),
  AI_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().optional().default(""),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().int().positive().default(50),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  AI_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
  AUTH_REGISTER_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900000),
  AUTH_REGISTER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900000),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  BLOCKED_EMAIL_DOMAINS: z.string().optional().default(""),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().max(10).default(1),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  JOB_LOCK_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  EXPORT_STORAGE_DIR: z.string().min(1).default("storage/exports"),
  EXPORT_EXPIRATION_DAYS: z.coerce.number().int().positive().default(7),
  EXPORT_MAX_RANGE_DAYS: z.coerce.number().int().positive().default(366),
  EXPORT_MAX_PENDING_PER_USER: z.coerce.number().int().positive().default(3),
  IMPORT_STORAGE_DIR: z.string().min(1).default("storage/imports"),
  IMPORT_MAX_FILE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
  IMPORT_MAX_ROWS: z.coerce.number().int().positive().default(5000),
  IMPORT_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  IMPORT_MAX_PENDING_PER_USER: z.coerce.number().int().positive().default(3),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.flatten().fieldErrors;
  throw new Error(`Invalid environment variables: ${JSON.stringify(details)}`);
}

export const env = {
  port: parsedEnv.data.PORT,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtExpiresIn: parsedEnv.data.JWT_EXPIRES_IN,
  clientUrl: parsedEnv.data.CLIENT_URL,
  nodeEnv: parsedEnv.data.NODE_ENV,
  isProduction: parsedEnv.data.NODE_ENV === "production",
  ai: {
    provider: parsedEnv.data.AI_PROVIDER,
    baseUrl: parsedEnv.data.AI_BASE_URL,
    apiKey: parsedEnv.data.AI_API_KEY,
    model: parsedEnv.data.AI_MODEL,
    timeoutMs: parsedEnv.data.AI_TIMEOUT_MS,
    dailyLimitPerUser: parsedEnv.data.AI_DAILY_LIMIT_PER_USER,
    rateLimitWindowMs: parsedEnv.data.AI_RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: parsedEnv.data.AI_RATE_LIMIT_MAX_REQUESTS,
  },
  auth: {
    registerRateLimitWindowMs:
      parsedEnv.data.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS,
    registerRateLimitMax: parsedEnv.data.AUTH_REGISTER_RATE_LIMIT_MAX,
    loginRateLimitWindowMs: parsedEnv.data.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
    loginRateLimitMax: parsedEnv.data.AUTH_LOGIN_RATE_LIMIT_MAX,
    blockedEmailDomains: parsedEnv.data.BLOCKED_EMAIL_DOMAINS,
  },
  jobs: {
    concurrency: parsedEnv.data.WORKER_CONCURRENCY,
    pollIntervalMs: parsedEnv.data.WORKER_POLL_INTERVAL_MS,
    lockTimeoutMs: parsedEnv.data.JOB_LOCK_TIMEOUT_MS,
  },
  exports: {
    storageDir: path.resolve(process.cwd(), parsedEnv.data.EXPORT_STORAGE_DIR),
    expirationDays: parsedEnv.data.EXPORT_EXPIRATION_DAYS,
    maxRangeDays: parsedEnv.data.EXPORT_MAX_RANGE_DAYS,
    maxPendingPerUser: parsedEnv.data.EXPORT_MAX_PENDING_PER_USER,
  },
  imports: {
    storageDir: path.resolve(process.cwd(), parsedEnv.data.IMPORT_STORAGE_DIR),
    maxFileSizeBytes: parsedEnv.data.IMPORT_MAX_FILE_SIZE_BYTES,
    maxRows: parsedEnv.data.IMPORT_MAX_ROWS,
    batchSize: parsedEnv.data.IMPORT_BATCH_SIZE,
    maxPendingPerUser: parsedEnv.data.IMPORT_MAX_PENDING_PER_USER,
  },
};
