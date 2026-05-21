import { DebtStatus, DebtType } from "@prisma/client";
import { z } from "zod";

const amountSchema = z.coerce
  .number({
    invalid_type_error: "Amount must be a valid number"
  })
  .finite("Amount must be a valid number")
  .positive("Amount must be greater than zero");

const dateSchema = z.coerce.date({
  invalid_type_error: "Date must be valid"
});

const noteSchema = z.string().trim().max(500, "Note is too long").nullable().optional();
const titleSchema = z.string().trim().min(1, "Title is required").max(120, "Title is too long");
const personNameSchema = z.string().trim().min(1, "Person name is required").max(120, "Person name is too long");

export const debtQuerySchema = z
  .object({
    type: z.nativeEnum(DebtType, { errorMap: () => ({ message: "Debt type is invalid" }) }).optional(),
    status: z.nativeEnum(DebtStatus, { errorMap: () => ({ message: "Debt status is invalid" }) }).optional(),
    search: z.string().trim().min(1, "Search cannot be empty").max(120, "Search is too long").optional(),
    dueBefore: dateSchema.optional(),
    dueAfter: dateSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.dueBefore && value.dueAfter && value.dueBefore < value.dueAfter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueBefore"],
        message: "Due before must be after due after"
      });
    }
  });

export const createDebtSchema = z
  .object({
    type: z.nativeEnum(DebtType, { errorMap: () => ({ message: "Debt type is invalid" }) }),
    title: titleSchema,
    personName: personNameSchema,
    totalAmount: amountSchema,
    dueDate: dateSchema.nullable().optional(),
    note: noteSchema
  })
  .strict();

export const updateDebtSchema = z
  .object({
    type: z.nativeEnum(DebtType, { errorMap: () => ({ message: "Debt type is invalid" }) }).optional(),
    title: titleSchema.optional(),
    personName: personNameSchema.optional(),
    totalAmount: amountSchema.optional(),
    dueDate: dateSchema.nullable().optional(),
    note: noteSchema
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    path: ["body"],
    message: "At least one field is required"
  });

export const recordDebtPaymentSchema = z
  .object({
    amount: amountSchema,
    walletId: z.string().uuid("Wallet ID must be valid"),
    categoryId: z.string().uuid("Category ID must be valid"),
    paymentDate: dateSchema,
    note: noteSchema
  })
  .strict();

export type DebtQueryInput = z.infer<typeof debtQuerySchema>;
export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type RecordDebtPaymentInput = z.infer<typeof recordDebtPaymentSchema>;
