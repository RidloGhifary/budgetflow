import fs from "node:fs";
import type { Response } from "express";

import { sendSuccess } from "../../utils/api-response";
import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { getAuditRequestContext } from "../audit-logs/audit-log.context";
import {
  createUserDataExport,
  getUserDataExport,
  getUserDataExportDownload,
  listUserDataExports
} from "./data-export.service";
import type {
  CreateDataExportInput,
  DataExportListQueryInput
} from "./data-export.validators";

export const createDataExportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const dataExport = await createUserDataExport(userId, req.body as CreateDataExportInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    statusCode: 202,
    message: "Export request queued",
    data: { export: dataExport }
  });
});

export const listDataExportsController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await listUserDataExports(userId, req.query as unknown as DataExportListQueryInput);

  return sendSuccess(res, {
    message: "Exports retrieved",
    data: result
  });
});

export const getDataExportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const dataExport = await getUserDataExport(userId, req.params.id);

  return sendSuccess(res, {
    message: "Export retrieved",
    data: { export: dataExport }
  });
});

export const downloadDataExportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const file = await getUserDataExportDownload(userId, req.params.id, getAuditRequestContext(req));

  return sendExportFile(res, file);
});

function sendExportFile(
  res: Response,
  file: {
    fileName: string;
    filePath: string;
    mimeType: string;
  }
) {
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFileName(file.fileName)}"`);

  return fs.createReadStream(file.filePath).pipe(res);
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/["\r\n]/g, "_");
}
