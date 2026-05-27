import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../utils/app-error";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { sanitizeAuditPayload } from "../audit-logs/audit-log.sanitizer";
import { JOB_TYPES } from "../background-jobs/background-job.constants";
import { enqueueBackgroundJob } from "../background-jobs/background-job.service";
import { createSmartDataImportResultNotificationSafely } from "../smart-notifications/smart-notification.service";
import { createUserTransactionInTransaction } from "../transactions/transaction.service";
import { parseCsv } from "./csv-parser";
import { DATA_IMPORT_FORMATS, DATA_IMPORT_TYPES } from "./data-import.constants";
import { toDataImportResponse, toDataImportRowResponse } from "./data-import.mapper";
import {
  countDataImportRows,
  countUserDataImportsByStatus,
  createDataImport,
  createDataImportRows,
  findDataImportById,
  findDataImportRows,
  findDataImports,
  findOwnedCategoriesForImport,
  findOwnedWalletsForImport,
  findTransactionsForDuplicateDetection,
  findUserDataImportById,
  findRowsForImportProcessing,
  markDataImportRowFailed,
  markDataImportRowImported,
  markDuplicateRowsSkipped,
  updateDataImportCancelled,
  updateDataImportCompleted,
  updateDataImportConfirmed,
  updateDataImportFailed,
  updateDataImportParsed,
  updateDataImportProcessing
} from "./data-import.repository";
import {
  buildTransactionImportDuplicateKey,
  detectTransactionImportMapping,
  getMissingRequiredImportFields,
  normalizeTransactionImportRow,
  type NormalizedTransactionImportRow
} from "./transaction-import-normalizer";
import { sanitizeOriginalFileName, saveImportFile } from "./data-import-storage.service";
import type {
  ConfirmDataImportInput,
  DataImportListQueryInput,
  DataImportPreviewQueryInput
} from "./data-import.validators";

interface UploadDataImportFileInput {
  buffer: Buffer;
  fileName: string;
  mimeType?: string | null;
}

export async function uploadTransactionImportFile(userId: string, input: UploadDataImportFileInput, context?: AuditRequestContext) {
  const file = validateImportFile(input);
  const activeImportCount = await countUserDataImportsByStatus(userId, ["UPLOADED", "PARSING", "AWAITING_CONFIRMATION", "PROCESSING"]);

  if (activeImportCount >= env.imports.maxPendingPerUser) {
    throw new BadRequestError(`You can have at most ${env.imports.maxPendingPerUser} active imports at once`);
  }

  const importId = randomUUID();
  const stored = await saveImportFile({
    buffer: file.buffer,
    fileName: file.fileName,
    importId,
    userId
  });
  const dataImport = await createDataImport({
    fileSize: stored.fileSize,
    format: DATA_IMPORT_FORMATS.CSV,
    id: importId,
    importType: DATA_IMPORT_TYPES.TRANSACTIONS,
    mimeType: file.mimeType,
    originalFileName: file.fileName,
    storageKey: stored.storageKey,
    userId
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.IMPORT_UPLOADED,
    context,
    entityId: dataImport.id,
    entityType: AUDIT_ENTITY_TYPES.IMPORT,
    metadata: {
      fileSize: stored.fileSize,
      format: DATA_IMPORT_FORMATS.CSV,
      importType: DATA_IMPORT_TYPES.TRANSACTIONS,
      originalFileName: file.fileName
    },
    userId
  });

  try {
    const parsed = await parseAndValidateImportRows(userId, dataImport.id, file.buffer.toString("utf8"));
    const updated = await updateDataImportParsed(dataImport.id, parsed.summary);

    await recordAuditLogSafely({
      action: AUDIT_ACTIONS.IMPORT_PREVIEW_GENERATED,
      context,
      entityId: dataImport.id,
      entityType: AUDIT_ENTITY_TYPES.IMPORT,
      metadata: {
        duplicateRows: updated.duplicateRows,
        invalidRows: updated.invalidRows,
        totalRows: updated.totalRows,
        validRows: updated.validRows
      },
      userId
    });

    return toDataImportResponse(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Import parsing failed";

    await updateDataImportFailed(dataImport.id, message);
    throw error;
  }
}

export async function listUserDataImports(userId: string, filters: DataImportListQueryInput) {
  const result = await findDataImports(userId, filters);

  return {
    imports: result.imports.map(toDataImportResponse),
    pagination: result.pagination
  };
}

export async function getUserDataImport(userId: string, id: string) {
  const dataImport = await findUserDataImportById(userId, id);

  if (!dataImport) {
    throw new NotFoundError("Import was not found");
  }

  return toDataImportResponse(dataImport);
}

export async function getUserDataImportPreviewRows(userId: string, id: string, filters: DataImportPreviewQueryInput) {
  const dataImport = await findUserDataImportById(userId, id);

  if (!dataImport) {
    throw new NotFoundError("Import was not found");
  }

  const result = await findDataImportRows(id, filters);

  return {
    pagination: result.pagination,
    rows: result.rows.map(toDataImportRowResponse)
  };
}

export async function confirmUserDataImport(
  userId: string,
  id: string,
  input: ConfirmDataImportInput,
  context?: AuditRequestContext
) {
  const dataImport = await findUserDataImportById(userId, id);

  if (!dataImport) {
    throw new NotFoundError("Import was not found");
  }

  if (dataImport.status !== "AWAITING_CONFIRMATION") {
    throw new BadRequestError("Import is not ready for confirmation");
  }

  const importableRows = dataImport.validRows + (input.includeDuplicates ? dataImport.duplicateRows : 0);

  if (importableRows === 0) {
    throw new BadRequestError("There are no valid rows to import");
  }

  const job = await enqueueBackgroundJob({
    createdByUserId: userId,
    payload: {
      importId: id,
      includeDuplicates: input.includeDuplicates
    },
    type: JOB_TYPES.DATA_IMPORT_PROCESS
  });
  const updated = await updateDataImportConfirmed(id, job.id, sanitizeAuditPayload(input) as Prisma.InputJsonValue);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.IMPORT_CONFIRMED,
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.IMPORT,
    metadata: {
      includeDuplicates: input.includeDuplicates,
      importableRows
    },
    userId
  });

  return toDataImportResponse(updated);
}

export async function cancelUserDataImport(userId: string, id: string, context?: AuditRequestContext) {
  const existing = await findUserDataImportById(userId, id);

  if (!existing) {
    throw new NotFoundError("Import was not found");
  }

  if (["COMPLETED", "COMPLETED_WITH_ERRORS", "PROCESSING", "CANCELLED"].includes(existing.status)) {
    throw new BadRequestError("Import cannot be cancelled");
  }

  const result = await updateDataImportCancelled(userId, id);

  if (result.count === 0) {
    throw new BadRequestError("Import cannot be cancelled");
  }

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.IMPORT_CANCELLED,
    context,
    entityId: id,
    entityType: AUDIT_ENTITY_TYPES.IMPORT,
    metadata: {
      status: existing.status
    },
    userId
  });
}

export async function processDataImportJob(
  importId: string,
  includeDuplicates: boolean,
  updateProgress: (progress: number, result?: unknown) => Promise<unknown>,
  options: { isFinalAttempt?: boolean } = {}
) {
  const dataImport = await findDataImportById(importId);

  if (!dataImport) {
    throw new NotFoundError("Import was not found");
  }

  if (dataImport.status === "COMPLETED" || dataImport.status === "COMPLETED_WITH_ERRORS") {
    return {
      importId,
      importedRows: dataImport.importedRows
    };
  }

  try {
    await updateDataImportProcessing(importId);
    await updateProgress(5, { stage: "preparing_rows" });

    if (!includeDuplicates) {
      await markDuplicateRowsSkipped(importId);
    }

    const importableRowCount = dataImport.validRows + (includeDuplicates ? dataImport.duplicateRows : 0);
    let processedRows = 0;

    while (true) {
      const rows = await findRowsForImportProcessing(importId, includeDuplicates, env.imports.batchSize);

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        try {
          const normalizedData = getNormalizedTransactionRow(row.normalizedData);

          await prisma.$transaction(async (tx) => {
            const transaction = await createUserTransactionInTransaction(
              dataImport.userId,
              {
                amount: normalizedData.amount,
                categoryId: normalizedData.categoryId,
                note: normalizedData.note ?? null,
                purpose: "NORMAL",
                transactionDate: new Date(normalizedData.transactionDate),
                type: normalizedData.type,
                walletId: normalizedData.walletId
              },
              tx
            );

            await markDataImportRowImported(row.id, { createdTransactionId: transaction.id }, tx);
          });
        } catch (error) {
          await markDataImportRowFailed(row.id, error instanceof Error ? error.message : "Row import failed");
        }

        processedRows += 1;
      }

      const progress = importableRowCount > 0 ? 5 + Math.round((processedRows / importableRowCount) * 90) : 95;
      await updateProgress(Math.min(95, progress), {
        processedRows,
        stage: "creating_transactions"
      });
    }

    const counts = await countDataImportRows(importId);
    const completed = await updateDataImportCompleted(importId, {
      duplicateRows: dataImport.duplicateRows,
      failedRows: counts.FAILED,
      importedRows: counts.IMPORTED,
      invalidRows: counts.INVALID,
      skippedRows: counts.SKIPPED,
      totalRows: dataImport.totalRows,
      validRows: dataImport.validRows
    });
    const completedAction =
      completed.status === "COMPLETED_WITH_ERRORS" ? AUDIT_ACTIONS.IMPORT_COMPLETED_WITH_ERRORS : AUDIT_ACTIONS.IMPORT_COMPLETED;

    await recordAuditLogSafely({
      action: completedAction,
      entityId: importId,
      entityType: AUDIT_ENTITY_TYPES.IMPORT,
      metadata: {
        duplicateRows: completed.duplicateRows,
        failedRows: completed.failedRows,
        importedRows: completed.importedRows,
        invalidRows: completed.invalidRows,
        skippedRows: completed.skippedRows,
        totalRows: completed.totalRows
      },
      userId: completed.userId
    });

    await createSmartDataImportResultNotificationSafely({
      failedRows: completed.failedRows,
      importId,
      importedRows: completed.importedRows,
      result: completed.status === "COMPLETED" ? "completed" : "completed_with_errors",
      userId: completed.userId
    });

    return {
      importId,
      importedRows: completed.importedRows,
      status: completed.status
    };
  } catch (error) {
    if (!options.isFinalAttempt) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Import failed";
    const failed = await updateDataImportFailed(importId, errorMessage);

    await recordAuditLogSafely({
      action: AUDIT_ACTIONS.IMPORT_FAILED,
      entityId: importId,
      entityType: AUDIT_ENTITY_TYPES.IMPORT,
      errorMessage,
      metadata: {
        importType: failed.importType,
        totalRows: failed.totalRows
      },
      result: "FAILURE",
      severity: "WARNING",
      userId: failed.userId
    });

    await createSmartDataImportResultNotificationSafely({
      importId,
      result: "failed",
      safeErrorMessage: "BudgetFlow could not complete your transaction import.",
      userId: failed.userId
    });

    throw error;
  }
}

async function parseAndValidateImportRows(userId: string, importId: string, content: string) {
  const parsed = parseCsv(content);

  if (parsed.records.length > env.imports.maxRows) {
    throw new BadRequestError(`CSV import supports up to ${env.imports.maxRows} rows`);
  }

  const mapping = detectTransactionImportMapping(parsed.headers);
  const missingFields = getMissingRequiredImportFields(mapping);

  if (missingFields.length > 0) {
    throw new BadRequestError(`CSV is missing required columns: ${missingFields.join(", ")}`);
  }

  const [wallets, categories] = await Promise.all([
    findOwnedWalletsForImport(userId),
    findOwnedCategoriesForImport(userId)
  ]);
  const normalizedRows = parsed.records.map((record) => {
    const normalized = normalizeTransactionImportRow({
      categories,
      mapping,
      rawData: record.data,
      wallets
    });

    return {
      record,
      ...normalized
    };
  });
  const validNormalizedRows = normalizedRows
    .map((row) => row.normalizedData)
    .filter((row): row is NormalizedTransactionImportRow => Boolean(row));
  const existingDuplicateKeys = await findExistingDuplicateKeys(userId, validNormalizedRows);
  const fileDuplicateKeys = new Set<string>();
  let duplicateRows = 0;
  let invalidRows = 0;
  let validRows = 0;
  const rows = normalizedRows.map((row) => {
    const errors = row.errors;
    let validationStatus: "VALID" | "INVALID" | "DUPLICATE" = errors.length > 0 ? "INVALID" : "VALID";
    let duplicateKey: string | null = row.normalizedData?.duplicateKey ?? null;

    if (validationStatus === "VALID" && row.normalizedData) {
      if (fileDuplicateKeys.has(row.normalizedData.duplicateKey) || existingDuplicateKeys.has(row.normalizedData.duplicateKey)) {
        validationStatus = "DUPLICATE";
      }

      fileDuplicateKeys.add(row.normalizedData.duplicateKey);
    }

    if (validationStatus === "VALID") {
      validRows += 1;
    } else if (validationStatus === "DUPLICATE") {
      duplicateRows += 1;
    } else {
      invalidRows += 1;
      duplicateKey = null;
    }

    return {
      duplicateKey,
      importId,
      matchedCategoryId: row.normalizedData?.categoryId ?? null,
      matchedWalletId: row.normalizedData?.walletId ?? null,
      normalizedData: row.normalizedData ? (sanitizeAuditPayload(row.normalizedData) as Prisma.InputJsonValue) : null,
      rawData: sanitizeAuditPayload(row.record.data) as Prisma.InputJsonValue,
      rowNumber: row.record.rowNumber,
      validationErrors:
        validationStatus === "INVALID"
          ? (sanitizeAuditPayload(errors) as Prisma.InputJsonValue)
          : validationStatus === "DUPLICATE"
            ? (["Possible duplicate transaction."] as Prisma.InputJsonValue)
            : null,
      validationStatus
    };
  });

  await createDataImportRows(rows);

  return {
    summary: {
      duplicateRows,
      invalidRows,
      mapping: sanitizeAuditPayload(mapping) as Prisma.InputJsonValue,
      summary: sanitizeAuditPayload({
        headers: parsed.headers,
        missingFields: [],
        supportedFormats: ["CSV"],
        xlsxSupported: false
      }) as Prisma.InputJsonValue,
      totalRows: parsed.records.length,
      validRows
    }
  };
}

async function findExistingDuplicateKeys(userId: string, rows: NormalizedTransactionImportRow[]) {
  if (rows.length === 0) {
    return new Set<string>();
  }

  const timestamps = rows.map((row) => new Date(row.transactionDate).getTime());
  const startDate = new Date(Math.min(...timestamps));
  const endDate = new Date(Math.max(...timestamps));

  endDate.setUTCHours(23, 59, 59, 999);

  const transactions = await findTransactionsForDuplicateDetection(userId, startDate, endDate);

  return new Set(
    transactions.map((transaction) =>
      buildTransactionImportDuplicateKey({
        amount: Number(transaction.amount),
        categoryId: transaction.categoryId,
        note: transaction.note,
        transactionDate: transaction.transactionDate.toISOString(),
        type: transaction.type,
        walletId: transaction.walletId
      })
    )
  );
}

function validateImportFile(input: UploadDataImportFileInput) {
  const fileName = sanitizeOriginalFileName(input.fileName);
  const extension = fileName.split(".").pop()?.toLowerCase();
  const mimeType = input.mimeType?.split(";")[0]?.trim().toLowerCase() || null;

  if (!input.buffer || input.buffer.length === 0) {
    throw new BadRequestError("Import file is required");
  }

  if (input.buffer.length > env.imports.maxFileSizeBytes) {
    throw new BadRequestError(`Import file must be ${Math.floor(env.imports.maxFileSizeBytes / 1024 / 1024)}MB or smaller`);
  }

  if (extension === "xlsx") {
    throw new BadRequestError("XLSX imports are not supported yet. Please upload a CSV file.");
  }

  if (extension !== "csv") {
    throw new BadRequestError("Only CSV imports are supported");
  }

  if (input.buffer.includes(0)) {
    throw new BadRequestError("CSV import must be a text file");
  }

  return {
    buffer: input.buffer,
    fileName,
    mimeType
  };
}

function getNormalizedTransactionRow(value: Prisma.JsonValue | null): NormalizedTransactionImportRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError("Import row is missing normalized data");
  }

  const row = value as Record<string, unknown>;

  if (
    typeof row.amount !== "number" ||
    typeof row.categoryId !== "string" ||
    typeof row.transactionDate !== "string" ||
    (row.type !== "INCOME" && row.type !== "EXPENSE") ||
    typeof row.walletId !== "string"
  ) {
    throw new BadRequestError("Import row is invalid");
  }

  return row as unknown as NormalizedTransactionImportRow;
}
