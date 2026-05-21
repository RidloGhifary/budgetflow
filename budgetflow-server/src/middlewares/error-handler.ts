import type { ErrorRequestHandler } from "express";

import { env } from "../config/env";
import { logger } from "../lib/logger";
import { AppError } from "../utils/app-error";
import { sendError } from "../utils/api-response";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    return sendError(res, {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
      errors: error.details
    });
  }

  logger.error({ error }, "Unhandled server error");

  return sendError(res, {
    statusCode: 500,
    message: env.isProduction ? "Internal server error" : error.message,
    code: "INTERNAL_SERVER_ERROR",
    errors: env.isProduction ? null : { stack: error.stack }
  });
};
