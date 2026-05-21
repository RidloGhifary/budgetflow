import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { corsOptions } from "./config/cors";
import { apiRouter } from "./routes";
import { errorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found";
import { requestLogger } from "./middlewares/request-logger";
import { sendSuccess } from "./utils/api-response";

export const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  return sendSuccess(res, {
    message: "BudgetFlow API is running",
    data: {
      status: "ok",
      timestamp: new Date().toISOString()
    }
  });
});

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
