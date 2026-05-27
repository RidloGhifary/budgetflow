import { RecurringTransactionFrequency, RecurringTransactionStatus, TransactionType } from "@prisma/client";
import { z } from "zod";

const amountSchema = z.coerce
  .number({
    invalid_type_error: "Amount must be a valid number"
  })
  .finite("Amount must be a valid number")
  .positive("Amount must be greater than zero");

const scheduleDateSchema = z.coerce.date({
  invalid_type_error: "Date must be valid"
});

const noteSchema = z.string().trim().max(500, "Note is too long").nullable().optional();

export const recurringTransactionQuerySchema = z
  .object({
    status: z.nativeEnum(RecurringTransactionStatus).optional(),
    type: z.nativeEnum(TransactionType).optional(),
    frequency: z.nativeEnum(RecurringTransactionFrequency).optional(),
    walletId: z.string().uuid("Wallet ID must be valid").optional(),
    categoryId: z.string().uuid("Category ID must be valid").optional(),
    sortBy: z.enum(["nextRunDate", "createdAt", "amount", "name"]).default("nextRunDate").optional(),
    sortDirection: z.enum(["asc", "desc"]).default("asc").optional()
  })
  .strict();

export const createRecurringTransactionSchema = z
  .object({
    walletId: z.string().uuid("Wallet ID must be valid"),
    categoryId: z.string().uuid("Category ID must be valid"),
    name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
    note: noteSchema,
    type: z.nativeEnum(TransactionType, {
      errorMap: () => ({ message: "Transaction type is invalid" })
    }),
    amount: amountSchema,
    frequency: z.nativeEnum(RecurringTransactionFrequency, {
      errorMap: () => ({ message: "Frequency is invalid" })
    }),
    interval: z.coerce.number().int("Interval must be a whole number").positive("Interval must be greater than zero").max(60, "Interval is too large").default(1),
    startDate: scheduleDateSchema,
    endDate: scheduleDateSchema.nullable().optional(),
    autoGenerate: z.boolean().default(true)
  })
  .strict()
  .superRefine(validateDateRange);

export const updateRecurringTransactionSchema = z
  .object({
    walletId: z.string().uuid("Wallet ID must be valid").optional(),
    categoryId: z.string().uuid("Category ID must be valid").optional(),
    name: z.string().trim().min(1, "Name is required").max(120, "Name is too long").optional(),
    note: noteSchema,
    type: z
      .nativeEnum(TransactionType, {
        errorMap: () => ({ message: "Transaction type is invalid" })
      })
      .optional(),
    amount: amountSchema.optional(),
    frequency: z
      .nativeEnum(RecurringTransactionFrequency, {
        errorMap: () => ({ message: "Frequency is invalid" })
      })
      .optional(),
    interval: z.coerce.number().int("Interval must be a whole number").positive("Interval must be greater than zero").max(60, "Interval is too large").optional(),
    startDate: scheduleDateSchema.optional(),
    endDate: scheduleDateSchema.nullable().optional(),
    autoGenerate: z.boolean().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    path: ["body"],
    message: "At least one field is required"
  })
  .superRefine(validateDateRange);

export type RecurringTransactionQueryInput = z.infer<typeof recurringTransactionQuerySchema>;
export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionSchema>;
export type UpdateRecurringTransactionInput = z.infer<typeof updateRecurringTransactionSchema>;

function validateDateRange(
  value: { endDate?: Date | null; startDate?: Date },
  context: z.RefinementCtx
) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be after start date"
    });
  }
}
