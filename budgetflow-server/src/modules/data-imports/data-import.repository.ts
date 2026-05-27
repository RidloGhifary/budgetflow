import { Prisma, type DataImportRowStatus, type DataImportStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { DbClient } from "../transactions/transaction.repository";
import type { DataImportListQueryInput, DataImportPreviewQueryInput } from "./data-import.validators";

export const dataImportSelect = {
  cancelledAt: true,
  completedAt: true,
  confirmedAt: true,
  createdAt: true,
  duplicateRows: true,
  errorMessage: true,
  failedAt: true,
  failedRows: true,
  fileSize: true,
  format: true,
  id: true,
  importType: true,
  importedRows: true,
  invalidRows: true,
  job: {
    select: {
      attempts: true,
      maxAttempts: true,
      progress: true,
      status: true
    }
  },
  jobId: true,
  mapping: true,
  mimeType: true,
  options: true,
  originalFileName: true,
  parsedAt: true,
  requestedAt: true,
  skippedRows: true,
  startedAt: true,
  status: true,
  summary: true,
  totalRows: true,
  updatedAt: true,
  userId: true,
  validRows: true
} satisfies Prisma.DataImportSelect;

const dataImportInternalSelect = {
  ...dataImportSelect,
  storageKey: true
} satisfies Prisma.DataImportSelect;

export const dataImportRowSelect = {
  createdAt: true,
  createdTransactionId: true,
  duplicateKey: true,
  id: true,
  importedAt: true,
  importId: true,
  matchedCategoryId: true,
  matchedWalletId: true,
  normalizedData: true,
  rawData: true,
  rowNumber: true,
  skippedReason: true,
  updatedAt: true,
  validationErrors: true,
  validationStatus: true
} satisfies Prisma.DataImportRowSelect;

export type DataImportRecord = Prisma.DataImportGetPayload<{
  select: typeof dataImportSelect;
}>;

export type DataImportInternalRecord = Prisma.DataImportGetPayload<{
  select: typeof dataImportInternalSelect;
}>;

export type DataImportRowRecord = Prisma.DataImportRowGetPayload<{
  select: typeof dataImportRowSelect;
}>;

export interface CreateDataImportInput {
  fileSize: number;
  format: "CSV";
  id?: string;
  importType: "TRANSACTIONS";
  mimeType?: string | null;
  originalFileName: string;
  storageKey: string;
  userId: string;
}

export interface CreateDataImportRowInput {
  duplicateKey?: string | null;
  importId: string;
  matchedCategoryId?: string | null;
  matchedWalletId?: string | null;
  normalizedData?: Prisma.InputJsonValue | null;
  rawData: Prisma.InputJsonValue;
  rowNumber: number;
  validationErrors?: Prisma.InputJsonValue | null;
  validationStatus: DataImportRowStatus;
}

export function createDataImport(data: CreateDataImportInput) {
  return prisma.dataImport.create({
    data: {
      fileSize: data.fileSize,
      format: data.format,
      id: data.id,
      importType: data.importType,
      mimeType: data.mimeType,
      originalFileName: data.originalFileName,
      status: "PARSING",
      storageKey: data.storageKey,
      userId: data.userId
    },
    select: dataImportInternalSelect
  });
}

export function updateDataImportParsed(
  id: string,
  data: {
    duplicateRows: number;
    invalidRows: number;
    mapping: Prisma.InputJsonValue;
    summary: Prisma.InputJsonValue;
    totalRows: number;
    validRows: number;
  }
) {
  return prisma.dataImport.update({
    where: { id },
    data: {
      duplicateRows: data.duplicateRows,
      invalidRows: data.invalidRows,
      mapping: data.mapping,
      parsedAt: new Date(),
      status: "AWAITING_CONFIRMATION",
      summary: data.summary,
      totalRows: data.totalRows,
      validRows: data.validRows
    },
    select: dataImportSelect
  });
}

export function updateDataImportFailed(id: string, errorMessage: string) {
  return prisma.dataImport.update({
    where: { id },
    data: {
      errorMessage,
      failedAt: new Date(),
      status: "FAILED"
    },
    select: dataImportSelect
  });
}

export function createDataImportRows(rows: CreateDataImportRowInput[]) {
  if (rows.length === 0) {
    return Promise.resolve({ count: 0 });
  }

  return prisma.dataImportRow.createMany({
    data: rows as Prisma.DataImportRowCreateManyInput[]
  });
}

export async function findDataImports(userId: string, filters: DataImportListQueryInput) {
  const where: Prisma.DataImportWhereInput = {
    userId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.importType ? { importType: filters.importType } : {}),
    ...(filters.format ? { format: filters.format } : {})
  };
  const [imports, totalItems] = await Promise.all([
    prisma.dataImport.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: dataImportSelect,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize
    }),
    prisma.dataImport.count({ where })
  ]);

  return {
    imports,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize))
    }
  };
}

export function findUserDataImportById(userId: string, id: string) {
  return prisma.dataImport.findFirst({
    where: { id, userId },
    select: dataImportSelect
  });
}

export function findDataImportById(id: string) {
  return prisma.dataImport.findUnique({
    where: { id },
    select: dataImportInternalSelect
  });
}

export async function findDataImportRows(importId: string, filters: DataImportPreviewQueryInput) {
  const where: Prisma.DataImportRowWhereInput = {
    importId,
    ...(filters.status ? { validationStatus: filters.status } : {})
  };
  const [rows, totalItems] = await Promise.all([
    prisma.dataImportRow.findMany({
      where,
      orderBy: [{ rowNumber: "asc" }],
      select: dataImportRowSelect,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize
    }),
    prisma.dataImportRow.count({ where })
  ]);

  return {
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize))
    },
    rows
  };
}

export function countUserDataImportsByStatus(userId: string, statuses: DataImportStatus[]) {
  return prisma.dataImport.count({
    where: {
      status: { in: statuses },
      userId
    }
  });
}

export function updateDataImportConfirmed(id: string, jobId: string, options: Prisma.InputJsonValue) {
  return prisma.dataImport.update({
    where: { id },
    data: {
      confirmedAt: new Date(),
      errorMessage: null,
      jobId,
      options,
      status: "PROCESSING"
    },
    select: dataImportSelect
  });
}

export function updateDataImportProcessing(id: string) {
  return prisma.dataImport.update({
    where: { id },
    data: {
      errorMessage: null,
      startedAt: new Date(),
      status: "PROCESSING"
    },
    select: dataImportInternalSelect
  });
}

export function updateDataImportCompleted(
  id: string,
  data: {
    duplicateRows: number;
    failedRows: number;
    importedRows: number;
    invalidRows: number;
    skippedRows: number;
    totalRows: number;
    validRows: number;
  }
) {
  const hasErrors = data.invalidRows > 0 || data.failedRows > 0 || data.skippedRows > 0;

  return prisma.dataImport.update({
    where: { id },
    data: {
      completedAt: new Date(),
      duplicateRows: data.duplicateRows,
      errorMessage: null,
      failedAt: null,
      failedRows: data.failedRows,
      importedRows: data.importedRows,
      invalidRows: data.invalidRows,
      skippedRows: data.skippedRows,
      status: hasErrors ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      totalRows: data.totalRows,
      validRows: data.validRows
    },
    select: dataImportSelect
  });
}

export function updateDataImportCancelled(userId: string, id: string) {
  return prisma.dataImport.updateMany({
    where: {
      id,
      status: {
        in: ["UPLOADED", "PARSING", "AWAITING_CONFIRMATION", "FAILED"]
      },
      userId
    },
    data: {
      cancelledAt: new Date(),
      status: "CANCELLED"
    }
  });
}

export function markDuplicateRowsSkipped(importId: string) {
  return prisma.dataImportRow.updateMany({
    where: {
      importId,
      validationStatus: "DUPLICATE"
    },
    data: {
      skippedReason: "Possible duplicate transaction.",
      validationStatus: "SKIPPED"
    }
  });
}

export function findRowsForImportProcessing(importId: string, includeDuplicates: boolean, take: number) {
  const statuses: DataImportRowStatus[] = includeDuplicates ? ["VALID", "DUPLICATE"] : ["VALID"];

  return prisma.dataImportRow.findMany({
    where: {
      importId,
      validationStatus: {
        in: statuses
      }
    },
    orderBy: [{ rowNumber: "asc" }],
    select: dataImportRowSelect,
    take
  });
}

export function markDataImportRowImported(
  rowId: string,
  data: {
    createdTransactionId: string;
  },
  client: DbClient = prisma
) {
  return client.dataImportRow.update({
    where: { id: rowId },
    data: {
      createdTransactionId: data.createdTransactionId,
      importedAt: new Date(),
      validationStatus: "IMPORTED"
    },
    select: dataImportRowSelect
  });
}

export function markDataImportRowFailed(rowId: string, errorMessage: string) {
  return prisma.dataImportRow.update({
    where: { id: rowId },
    data: {
      skippedReason: errorMessage.slice(0, 500),
      validationStatus: "FAILED"
    },
    select: dataImportRowSelect
  });
}

export async function countDataImportRows(importId: string) {
  const grouped = await prisma.dataImportRow.groupBy({
    by: ["validationStatus"],
    where: {
      importId
    },
    _count: {
      _all: true
    }
  });

  return grouped.reduce<Record<DataImportRowStatus, number>>(
    (counts, item) => ({
      ...counts,
      [item.validationStatus]: item._count._all
    }),
    {
      DUPLICATE: 0,
      FAILED: 0,
      IMPORTED: 0,
      INVALID: 0,
      SKIPPED: 0,
      VALID: 0
    }
  );
}

export function findOwnedWalletsForImport(userId: string) {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ name: "asc" }]
  });
}

export function findOwnedCategoriesForImport(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });
}

export function findTransactionsForDuplicateDetection(userId: string, startDate: Date, endDate: Date) {
  return prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: startDate,
        lte: endDate
      },
      userId
    },
    select: {
      amount: true,
      categoryId: true,
      note: true,
      transactionDate: true,
      type: true,
      walletId: true
    }
  });
}
