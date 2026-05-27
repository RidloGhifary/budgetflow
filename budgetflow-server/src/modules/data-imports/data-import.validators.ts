import { DataImportFormat, DataImportRowStatus, DataImportStatus, DataImportType } from "@prisma/client";
import { z } from "zod";

export const dataImportListQuerySchema = z
  .object({
    status: z.nativeEnum(DataImportStatus).optional(),
    importType: z.nativeEnum(DataImportType).optional(),
    format: z.nativeEnum(DataImportFormat).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(10)
  })
  .strict();

export const dataImportPreviewQuerySchema = z
  .object({
    status: z.nativeEnum(DataImportRowStatus).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20)
  })
  .strict();

export const confirmDataImportSchema = z
  .object({
    includeDuplicates: z.boolean().default(false)
  })
  .strict();

export type DataImportListQueryInput = z.infer<typeof dataImportListQuerySchema>;
export type DataImportPreviewQueryInput = z.infer<typeof dataImportPreviewQuerySchema>;
export type ConfirmDataImportInput = z.infer<typeof confirmDataImportSchema>;

