import type { RequestHandler } from "express";

import { logger } from "../lib/logger";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTimeMs: Date.now() - startedAt
      },
      "request completed"
    );
  });

  next();
};
