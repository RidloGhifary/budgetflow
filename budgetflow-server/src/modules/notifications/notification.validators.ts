import { NotificationCategory, NotificationSeverity, NotificationStatus } from "@prisma/client";
import { z } from "zod";

export const notificationQuerySchema = z
  .object({
    category: z.nativeEnum(NotificationCategory).optional(),
    endDate: z.coerce.date({ invalid_type_error: "End date must be valid" }).optional(),
    page: z.coerce.number().int("Page must be a whole number").positive("Page must be greater than zero").default(1),
    pageSize: z.coerce
      .number()
      .int("Page size must be a whole number")
      .positive("Page size must be greater than zero")
      .max(50, "Page size cannot be more than 50")
      .default(10),
    search: z.string().trim().max(120, "Search is too long").optional(),
    severity: z.nativeEnum(NotificationSeverity).optional(),
    startDate: z.coerce.date({ invalid_type_error: "Start date must be valid" }).optional(),
    status: z.nativeEnum(NotificationStatus).optional(),
    type: z.string().trim().min(1, "Type is required").max(120, "Type is too long").optional()
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

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
