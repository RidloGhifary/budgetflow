import { sendSuccess } from "../../utils/api-response";
import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { getAuditRequestContext } from "../audit-logs/audit-log.context";
import {
  cancelUserDataImport,
  confirmUserDataImport,
  getUserDataImport,
  getUserDataImportPreviewRows,
  listUserDataImports,
  uploadTransactionImportFile
} from "./data-import.service";
import type {
  ConfirmDataImportInput,
  DataImportListQueryInput,
  DataImportPreviewQueryInput
} from "./data-import.validators";

export const uploadDataImportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const dataImport = await uploadTransactionImportFile(
    userId,
    {
      buffer: Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
      fileName: getHeaderValue(req.headers["x-file-name"]) ?? "budgetflow-import.csv",
      mimeType: getHeaderValue(req.headers["content-type"])
    },
    getAuditRequestContext(req)
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Import preview generated",
    data: { import: dataImport }
  });
});

export const listDataImportsController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await listUserDataImports(userId, req.query as unknown as DataImportListQueryInput);

  return sendSuccess(res, {
    message: "Imports retrieved",
    data: result
  });
});

export const getDataImportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const dataImport = await getUserDataImport(userId, req.params.id);

  return sendSuccess(res, {
    message: "Import retrieved",
    data: { import: dataImport }
  });
});

export const getDataImportPreviewController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await getUserDataImportPreviewRows(
    userId,
    req.params.id,
    req.query as unknown as DataImportPreviewQueryInput
  );

  return sendSuccess(res, {
    message: "Import rows retrieved",
    data: result
  });
});

export const confirmDataImportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const dataImport = await confirmUserDataImport(
    userId,
    req.params.id,
    req.body as ConfirmDataImportInput,
    getAuditRequestContext(req)
  );

  return sendSuccess(res, {
    statusCode: 202,
    message: "Import queued",
    data: { import: dataImport }
  });
});

export const cancelDataImportController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);

  await cancelUserDataImport(userId, req.params.id, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Import cancelled"
  });
});

function getHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

