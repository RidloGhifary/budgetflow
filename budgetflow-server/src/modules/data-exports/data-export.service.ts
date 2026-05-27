import type { Prisma } from "@prisma/client";

import { env } from "../../config/env";
import { BadRequestError, NotFoundError } from "../../utils/app-error";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { sanitizeAuditPayload } from "../audit-logs/audit-log.sanitizer";
import { JOB_TYPES } from "../background-jobs/background-job.constants";
import { enqueueBackgroundJob } from "../background-jobs/background-job.service";
import { createSmartDataExportResultNotificationSafely } from "../smart-notifications/smart-notification.service";
import { findOwnedCategory, findOwnedWallet } from "../transactions/transaction.repository";
import {
  countUserDataExportsByStatus,
  createDataExport,
  findDataExportById,
  findDataExports,
  findUserDataExportById,
  findUserDataExportForDownload,
  updateDataExportCompleted,
  updateDataExportDownloaded,
  updateDataExportFailed,
  updateDataExportJobId,
  updateDataExportProcessing
} from "./data-export.repository";
import { generateTransactionCsvExport } from "./data-export-generator";
import { toDataExportResponse } from "./data-export.mapper";
import type {
  CreateDataExportInput,
  DataExportListQueryInput,
  DataExportTransactionFilters
} from "./data-export.validators";
import { assertExportFileExists, saveExportFile } from "./export-storage.service";

export async function createUserDataExport(userId: string, input: CreateDataExportInput, context?: AuditRequestContext) {
  await assertExportFiltersOwned(userId, input.filters);

  const activeExportCount = await countUserDataExportsByStatus(userId, ["PENDING", "PROCESSING"]);

  if (activeExportCount >= env.exports.maxPendingPerUser) {
    throw new BadRequestError(`You can have at most ${env.exports.maxPendingPerUser} pending exports at once`);
  }

  const dataExport = await createDataExport({
    expiresAt: getExportExpirationDate(),
    exportType: input.exportType,
    filters: sanitizeAuditPayload(input.filters),
    format: input.format,
    userId
  });
  const job = await enqueueBackgroundJob({
    createdByUserId: userId,
    payload: {
      exportId: dataExport.id
    },
    type: JOB_TYPES.DATA_EXPORT_CREATE
  });
  const updated = await updateDataExportJobId(dataExport.id, job.id);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.EXPORT_REQUESTED,
    context,
    entityId: dataExport.id,
    entityType: AUDIT_ENTITY_TYPES.EXPORT,
    metadata: {
      exportType: input.exportType,
      format: input.format,
      filters: input.filters
    },
    userId
  });

  return toDataExportResponse(updated);
}

export async function listUserDataExports(userId: string, filters: DataExportListQueryInput) {
  const result = await findDataExports(userId, filters);

  return {
    exports: result.exports.map(toDataExportResponse),
    pagination: result.pagination
  };
}

export async function getUserDataExport(userId: string, id: string) {
  const dataExport = await findUserDataExportById(userId, id);

  if (!dataExport) {
    throw new NotFoundError("Export was not found");
  }

  return toDataExportResponse(dataExport);
}

export async function getUserDataExportDownload(userId: string, id: string, context?: AuditRequestContext) {
  const dataExport = await findUserDataExportForDownload(userId, id);

  if (!dataExport) {
    throw new NotFoundError("Export was not found");
  }

  if (dataExport.status !== "COMPLETED" || !dataExport.storageKey || !dataExport.fileName || !dataExport.mimeType) {
    throw new BadRequestError("Export is not ready for download");
  }

  if (dataExport.expiresAt && dataExport.expiresAt < new Date()) {
    throw new BadRequestError("Export has expired");
  }

  const filePath = await assertExportFileExists(dataExport.storageKey);

  await updateDataExportDownloaded(userId, id);
  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.EXPORT_DOWNLOADED,
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.EXPORT,
    metadata: {
      exportType: dataExport.exportType,
      fileName: dataExport.fileName,
      format: dataExport.format,
      rowCount: dataExport.rowCount
    },
    userId
  });

  return {
    fileName: dataExport.fileName,
    filePath,
    mimeType: dataExport.mimeType
  };
}

export async function processDataExportJob(
  exportId: string,
  updateProgress: (progress: number, result?: unknown) => Promise<unknown>,
  options: { isFinalAttempt?: boolean } = {}
) {
  const dataExport = await findDataExportById(exportId);

  if (!dataExport) {
    throw new NotFoundError("Export was not found");
  }

  try {
    await updateDataExportProcessing(exportId);
    await updateProgress(20, { stage: "querying_data" });

    const generated = await generateTransactionCsvExport(dataExport.userId, normalizeExportFilters(dataExport.filters));

    await updateProgress(70, { rowCount: generated.rowCount, stage: "saving_file" });

    const stored = await saveExportFile({
      buffer: generated.buffer,
      exportId,
      fileName: generated.fileName,
      userId: dataExport.userId
    });
    const completed = await updateDataExportCompleted(exportId, {
      fileName: generated.fileName,
      fileSize: stored.fileSize,
      mimeType: generated.mimeType,
      rowCount: generated.rowCount,
      storageKey: stored.storageKey
    });

    await recordAuditLogSafely({
      action: AUDIT_ACTIONS.EXPORT_COMPLETED,
      entityId: exportId,
      entityType: AUDIT_ENTITY_TYPES.EXPORT,
      metadata: {
        exportType: completed.exportType,
        format: completed.format,
        rowCount: completed.rowCount
      },
      userId: completed.userId
    });

    await createSmartDataExportResultNotificationSafely({
      exportId,
      result: "completed",
      rowCount: completed.rowCount,
      userId: completed.userId
    });

    return {
      exportId,
      fileName: generated.fileName,
      rowCount: generated.rowCount
    };
  } catch (error) {
    if (!options.isFinalAttempt) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Export failed";
    const failed = await updateDataExportFailed(exportId, errorMessage);

    await recordAuditLogSafely({
      action: AUDIT_ACTIONS.EXPORT_FAILED,
      entityId: exportId,
      entityType: AUDIT_ENTITY_TYPES.EXPORT,
      errorMessage,
      metadata: {
        exportType: failed.exportType,
        format: failed.format
      },
      result: "FAILURE",
      severity: "WARNING",
      userId: failed.userId
    });

    await createSmartDataExportResultNotificationSafely({
      exportId,
      result: "failed",
      safeErrorMessage: "BudgetFlow could not complete your data export.",
      userId: failed.userId
    });

    throw error;
  }
}

async function assertExportFiltersOwned(userId: string, filters: DataExportTransactionFilters) {
  const [wallet, category] = await Promise.all([
    filters.walletId ? findOwnedWallet(userId, filters.walletId) : Promise.resolve(null),
    filters.categoryId ? findOwnedCategory(userId, filters.categoryId) : Promise.resolve(null)
  ]);

  if (filters.walletId && !wallet) {
    throw new NotFoundError("Wallet was not found");
  }

  if (filters.categoryId && !category) {
    throw new NotFoundError("Category was not found");
  }

  if (filters.type && category && category.type !== filters.type) {
    throw new BadRequestError("Category type must match export type filter");
  }
}

function getExportExpirationDate() {
  const expiresAt = new Date();

  expiresAt.setUTCDate(expiresAt.getUTCDate() + env.exports.expirationDays);

  return expiresAt;
}

function normalizeExportFilters(filters: Prisma.JsonValue | null): DataExportTransactionFilters {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return {};
  }

  const rawFilters = filters as Record<string, unknown>;

  return {
    categoryId: typeof rawFilters.categoryId === "string" ? rawFilters.categoryId : undefined,
    endDate: parseOptionalDate(rawFilters.endDate),
    search: typeof rawFilters.search === "string" ? rawFilters.search : undefined,
    startDate: parseOptionalDate(rawFilters.startDate),
    type: rawFilters.type === "INCOME" || rawFilters.type === "EXPENSE" ? rawFilters.type : undefined,
    walletId: typeof rawFilters.walletId === "string" ? rawFilters.walletId : undefined
  };
}

function parseOptionalDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
}
