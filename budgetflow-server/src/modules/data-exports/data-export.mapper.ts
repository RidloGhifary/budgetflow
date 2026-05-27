import type { DataExportRecord } from "./data-export.repository";

export function toDataExportResponse(dataExport: DataExportRecord) {
  return {
    id: dataExport.id,
    userId: dataExport.userId,
    exportType: dataExport.exportType,
    format: dataExport.format,
    status: dataExport.status,
    filters: dataExport.filters,
    fileName: dataExport.fileName,
    fileSize: dataExport.fileSize,
    mimeType: dataExport.mimeType,
    rowCount: dataExport.rowCount,
    errorMessage: dataExport.errorMessage,
    requestedAt: dataExport.requestedAt,
    startedAt: dataExport.startedAt,
    completedAt: dataExport.completedAt,
    failedAt: dataExport.failedAt,
    expiresAt: dataExport.expiresAt,
    downloadedAt: dataExport.downloadedAt,
    createdAt: dataExport.createdAt,
    updatedAt: dataExport.updatedAt,
    job: dataExport.job
      ? {
          status: dataExport.job.status,
          progress: dataExport.job.progress,
          attempts: dataExport.job.attempts,
          maxAttempts: dataExport.job.maxAttempts
        }
      : null
  };
}
