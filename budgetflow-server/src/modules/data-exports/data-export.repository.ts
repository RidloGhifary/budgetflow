import { Prisma, type DataExportStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { DataExportListQueryInput } from "./data-export.validators";

const dataExportSelect = {
  completedAt: true,
  createdAt: true,
  downloadedAt: true,
  errorMessage: true,
  expiresAt: true,
  exportType: true,
  failedAt: true,
  fileName: true,
  fileSize: true,
  filters: true,
  format: true,
  id: true,
  job: {
    select: {
      attempts: true,
      maxAttempts: true,
      progress: true,
      status: true
    }
  },
  jobId: true,
  mimeType: true,
  requestedAt: true,
  rowCount: true,
  startedAt: true,
  status: true,
  updatedAt: true,
  userId: true
} satisfies Prisma.DataExportSelect;

const dataExportInternalSelect = {
  ...dataExportSelect,
  storageKey: true
} satisfies Prisma.DataExportSelect;

export type DataExportRecord = Prisma.DataExportGetPayload<{
  select: typeof dataExportSelect;
}>;

export type DataExportInternalRecord = Prisma.DataExportGetPayload<{
  select: typeof dataExportInternalSelect;
}>;

export interface CreateDataExportData {
  expiresAt: Date;
  exportType: "TRANSACTIONS";
  filters: Prisma.InputJsonValue | null;
  format: "CSV";
  userId: string;
}

export function createDataExport(data: CreateDataExportData) {
  return prisma.dataExport.create({
    data: data as Prisma.DataExportUncheckedCreateInput,
    select: dataExportSelect
  });
}

export function updateDataExportJobId(id: string, jobId: string) {
  return prisma.dataExport.update({
    where: {
      id
    },
    data: {
      jobId
    },
    select: dataExportSelect
  });
}

export async function findDataExports(userId: string, filters: DataExportListQueryInput) {
  const where: Prisma.DataExportWhereInput = {
    userId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.exportType ? { exportType: filters.exportType } : {}),
    ...(filters.format ? { format: filters.format } : {})
  };
  const [exports, totalItems] = await Promise.all([
    prisma.dataExport.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: dataExportSelect,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize
    }),
    prisma.dataExport.count({ where })
  ]);

  return {
    exports,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize))
    }
  };
}

export function findUserDataExportById(userId: string, id: string) {
  return prisma.dataExport.findFirst({
    where: {
      id,
      userId
    },
    select: dataExportSelect
  });
}

export function findUserDataExportForDownload(userId: string, id: string) {
  return prisma.dataExport.findFirst({
    where: {
      id,
      userId
    },
    select: dataExportInternalSelect
  });
}

export function findDataExportById(id: string) {
  return prisma.dataExport.findUnique({
    where: {
      id
    },
    select: dataExportInternalSelect
  });
}

export function updateDataExportProcessing(id: string) {
  return prisma.dataExport.update({
    where: {
      id
    },
    data: {
      errorMessage: null,
      startedAt: new Date(),
      status: "PROCESSING"
    },
    select: dataExportInternalSelect
  });
}

export function updateDataExportCompleted(
  id: string,
  data: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    rowCount: number;
    storageKey: string;
  }
) {
  return prisma.dataExport.update({
    where: {
      id
    },
    data: {
      completedAt: new Date(),
      errorMessage: null,
      failedAt: null,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      rowCount: data.rowCount,
      status: "COMPLETED",
      storageKey: data.storageKey
    },
    select: dataExportInternalSelect
  });
}

export function updateDataExportFailed(id: string, errorMessage: string) {
  return prisma.dataExport.update({
    where: {
      id
    },
    data: {
      errorMessage,
      failedAt: new Date(),
      status: "FAILED"
    },
    select: dataExportInternalSelect
  });
}

export function updateDataExportDownloaded(userId: string, id: string) {
  return prisma.dataExport.updateMany({
    where: {
      id,
      userId
    },
    data: {
      downloadedAt: new Date()
    }
  });
}

export function countUserDataExportsByStatus(userId: string, statuses: DataExportStatus[]) {
  return prisma.dataExport.count({
    where: {
      userId,
      status: {
        in: statuses
      }
    }
  });
}
