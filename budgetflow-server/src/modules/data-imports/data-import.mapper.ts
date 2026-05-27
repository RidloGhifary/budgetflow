import type { DataImportRecord, DataImportRowRecord } from "./data-import.repository";

export function toDataImportResponse(dataImport: DataImportRecord) {
  return {
    cancelledAt: dataImport.cancelledAt,
    completedAt: dataImport.completedAt,
    confirmedAt: dataImport.confirmedAt,
    createdAt: dataImport.createdAt,
    duplicateRows: dataImport.duplicateRows,
    errorMessage: dataImport.errorMessage,
    failedAt: dataImport.failedAt,
    failedRows: dataImport.failedRows,
    fileSize: dataImport.fileSize,
    format: dataImport.format,
    id: dataImport.id,
    importType: dataImport.importType,
    importedRows: dataImport.importedRows,
    invalidRows: dataImport.invalidRows,
    job: dataImport.job
      ? {
          attempts: dataImport.job.attempts,
          maxAttempts: dataImport.job.maxAttempts,
          progress: dataImport.job.progress,
          status: dataImport.job.status
        }
      : null,
    mapping: dataImport.mapping,
    mimeType: dataImport.mimeType,
    options: dataImport.options,
    originalFileName: dataImport.originalFileName,
    parsedAt: dataImport.parsedAt,
    requestedAt: dataImport.requestedAt,
    skippedRows: dataImport.skippedRows,
    startedAt: dataImport.startedAt,
    status: dataImport.status,
    summary: dataImport.summary,
    totalRows: dataImport.totalRows,
    updatedAt: dataImport.updatedAt,
    userId: dataImport.userId,
    validRows: dataImport.validRows
  };
}

export function toDataImportRowResponse(row: DataImportRowRecord) {
  return {
    createdAt: row.createdAt,
    createdTransactionId: row.createdTransactionId,
    duplicateKey: row.duplicateKey,
    id: row.id,
    importedAt: row.importedAt,
    importId: row.importId,
    matchedCategoryId: row.matchedCategoryId,
    matchedWalletId: row.matchedWalletId,
    normalizedData: row.normalizedData,
    rawData: row.rawData,
    rowNumber: row.rowNumber,
    skippedReason: row.skippedReason,
    updatedAt: row.updatedAt,
    validationErrors: row.validationErrors,
    validationStatus: row.validationStatus
  };
}

