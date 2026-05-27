import { TransactionType } from "@prisma/client";
import { z } from "zod";

const maxSummaryRangeDays = 93;

const dateSchema = z.coerce.date({
  invalid_type_error: "Date must be valid"
});

const includeRecurringSchema = z
  .union([z.literal("true"), z.literal("false"), z.boolean()])
  .default("true")
  .transform((value) => value === true || value === "true");

const calendarFilterSchema = {
  categoryId: z.string().uuid("Category ID must be valid").optional(),
  includeRecurring: includeRecurringSchema,
  type: z.nativeEnum(TransactionType).optional(),
  walletId: z.string().uuid("Wallet ID must be valid").optional()
};

export const calendarSummaryQuerySchema = z
  .object({
    ...calendarFilterSchema,
    endDate: dateSchema,
    startDate: dateSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (value.startDate > value.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after start date"
      });
      return;
    }

    if (getInclusiveDayCount(value.startDate, value.endDate) > maxSummaryRangeDays) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: `Calendar date range cannot be more than ${maxSummaryRangeDays} days`
      });
    }
  });

export const calendarDayDetailQuerySchema = z
  .object({
    ...calendarFilterSchema,
    date: dateSchema,
    page: z.coerce.number().int("Page must be a whole number").positive("Page must be greater than zero").default(1),
    pageSize: z.coerce
      .number()
      .int("Page size must be a whole number")
      .positive("Page size must be greater than zero")
      .max(50, "Page size cannot be more than 50")
      .default(20)
  })
  .strict();

export type CalendarSummaryQueryInput = z.infer<typeof calendarSummaryQuerySchema>;
export type CalendarDayDetailQueryInput = z.infer<typeof calendarDayDetailQuerySchema>;

function getInclusiveDayCount(startDate: Date, endDate: Date) {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}
