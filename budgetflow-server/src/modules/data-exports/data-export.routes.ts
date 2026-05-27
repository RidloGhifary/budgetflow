import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate-request";
import {
  createDataExportController,
  downloadDataExportController,
  getDataExportController,
  listDataExportsController
} from "./data-export.controller";
import {
  createDataExportSchema,
  dataExportListQuerySchema
} from "./data-export.validators";

export const dataExportRouter = Router();

dataExportRouter.use(requireAuth);

dataExportRouter.get("/", validateQuery(dataExportListQuerySchema), listDataExportsController);
dataExportRouter.post("/", validateBody(createDataExportSchema), createDataExportController);
dataExportRouter.get("/:id", getDataExportController);
dataExportRouter.get("/:id/download", downloadDataExportController);
