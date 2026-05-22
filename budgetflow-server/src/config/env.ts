import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AI_PROVIDER: z.enum(["mock", "http"]).default("mock"),
  AI_BASE_URL: z.string().optional().default(""),
  AI_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().optional().default(""),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().int().positive().default(50),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  AI_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10)
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
    rateLimitMaxRequests: parsedEnv.data.AI_RATE_LIMIT_MAX_REQUESTS
  }
};
