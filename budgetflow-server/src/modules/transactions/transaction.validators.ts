import { TransactionPurpose, TransactionType } from "@prisma/client";
import { z } from "zod";

const amountSchema = z.coerce
  .number({
    invalid_type_error: "Amount must be a valid number"
  })
  .finite("Amount must be a valid number")
  .positive("Amount must be greater than zero");

const transactionDateSchema = z.coerce.date({
  invalid_type_error: "Transaction date must be a valid date"
});

const noteSchema = z.string().trim().max(500, "Note is too long").nullable().optional();

export const transactionQuerySchema = z
  .object({
    type: z.nativeEnum(TransactionType).optional(),
    purpose: z.nativeEnum(TransactionPurpose).optional(),
    walletId: z.string().uuid("Wallet ID must be valid").optional(),
    categoryId: z.string().uuid("Category ID must be valid").optional(),
    month: z.coerce.number().int("Month must be a whole number").min(1).max(12).optional(),
    year: z.coerce.number().int("Year must be a whole number").min(2000).max(2100).optional(),
    startDate: transactionDateSchema.optional(),
    endDate: transactionDateSchema.optional(),
    search: z.string().trim().min(1, "Search cannot be empty").max(120, "Search is too long").optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.month && !value.year) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["year"],
        message: "Year is required when filtering by month"
      });
    }

    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after start date"
      });
    }
  });

export const createTransactionSchema = z
  .object({
    walletId: z.string().uuid("Wallet ID must be valid"),
    categoryId: z.string().uuid("Category ID must be valid"),
    type: z.nativeEnum(TransactionType, {
      errorMap: () => ({ message: "Transaction type is invalid" })
    }),
    purpose: z
      .nativeEnum(TransactionPurpose, {
        errorMap: () => ({ message: "Transaction purpose is invalid" })
      })
      .default(TransactionPurpose.NORMAL),
    amount: amountSchema,
    transactionDate: transactionDateSchema,
    note: noteSchema
  })
  .strict();

export const updateTransactionSchema = z
  .object({
    walletId: z.string().uuid("Wallet ID must be valid").optional(),
    categoryId: z.string().uuid("Category ID must be valid").optional(),
    type: z
      .nativeEnum(TransactionType, {
        errorMap: () => ({ message: "Transaction type is invalid" })
      })
      .optional(),
    purpose: z
      .nativeEnum(TransactionPurpose, {
        errorMap: () => ({ message: "Transaction purpose is invalid" })
      })
      .optional(),
    amount: amountSchema.optional(),
    transactionDate: transactionDateSchema.optional(),
    note: noteSchema
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    path: ["body"],
    message: "At least one field is required"
  });

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
