import express, { Router } from "express";

import { env } from "../../config/env";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate-request";
import {
  cancelDataImportController,
  confirmDataImportController,
  getDataImportController,
  getDataImportPreviewController,
  listDataImportsController,
  uploadDataImportController
} from "./data-import.controller";
import {
  confirmDataImportSchema,
  dataImportListQuerySchema,
  dataImportPreviewQuerySchema
} from "./data-import.validators";

export const dataImportRouter = Router();

dataImportRouter.use(requireAuth);

dataImportRouter.get("/", validateQuery(dataImportListQuerySchema), listDataImportsController);
dataImportRouter.post(
  "/",
  express.raw({
    limit: env.imports.maxFileSizeBytes,
    type: [
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "text/plain",
      "application/octet-stream",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
  }),
  uploadDataImportController
);
dataImportRouter.get("/:id", getDataImportController);
dataImportRouter.get("/:id/rows", validateQuery(dataImportPreviewQuerySchema), getDataImportPreviewController);
dataImportRouter.post("/:id/confirm", validateBody(confirmDataImportSchema), confirmDataImportController);
dataImportRouter.post("/:id/cancel", cancelDataImportController);

