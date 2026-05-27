import { AuditLogResult, AuditLogSeverity } from "@prisma/client";
import { z } from "zod";

export const auditLogQuerySchema = z
  .object({
    action: z.string().trim().min(1, "Action is required").max(120, "Action is too long").optional(),
    entityType: z.string().trim().min(1, "Entity type is required").max(80, "Entity type is too long").optional(),
    entityId: z.string().trim().min(1, "Entity ID is required").max(120, "Entity ID is too long").optional(),
    result: z.nativeEnum(AuditLogResult).optional(),
    severity: z.nativeEnum(AuditLogSeverity).optional(),
    startDate: z.coerce.date({ invalid_type_error: "Start date must be valid" }).optional(),
    endDate: z.coerce.date({ invalid_type_error: "End date must be valid" }).optional(),
    search: z.string().trim().max(120, "Search is too long").optional(),
    page: z.coerce.number().int("Page must be a whole number").positive("Page must be greater than zero").default(1),
    pageSize: z.coerce
      .number()
      .int("Page size must be a whole number")
      .positive("Page size must be greater than zero")
      .max(50, "Page size cannot be more than 50")
      .default(10)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after start date"
      });
    }
  });

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
