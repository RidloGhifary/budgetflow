import { SavingGoalStatus } from "@prisma/client";
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

const nameSchema = z.string().trim().min(1, "Goal name is required").max(120, "Goal name is too long");
const noteSchema = z.string().trim().max(500, "Note is too long").nullable().optional();

export const goalQuerySchema = z
  .object({
    status: z.nativeEnum(SavingGoalStatus, { errorMap: () => ({ message: "Saving goal status is invalid" }) }).optional(),
    search: z.string().trim().min(1, "Search cannot be empty").max(120, "Search is too long").optional(),
    deadlineBefore: dateSchema.optional(),
    deadlineAfter: dateSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.deadlineBefore && value.deadlineAfter && value.deadlineBefore < value.deadlineAfter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadlineBefore"],
        message: "Deadline before must be after deadline after"
      });
    }
  });

export const createGoalSchema = z
  .object({
    name: nameSchema,
    targetAmount: amountSchema,
    deadline: dateSchema.nullable().optional(),
    note: noteSchema
  })
  .strict();

export const updateGoalSchema = z
  .object({
    name: nameSchema.optional(),
    targetAmount: amountSchema.optional(),
    deadline: dateSchema.nullable().optional(),
    status: z.literal(SavingGoalStatus.CANCELLED).optional(),
    note: noteSchema
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    path: ["body"],
    message: "At least one field is required"
  });

export const addSavingContributionSchema = z
  .object({
    amount: amountSchema,
    walletId: z.string().uuid("Wallet ID must be valid"),
    categoryId: z.string().uuid("Category ID must be valid"),
    contributionDate: dateSchema,
    note: noteSchema
  })
  .strict();

export type GoalQueryInput = z.infer<typeof goalQuerySchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type AddSavingContributionInput = z.infer<typeof addSavingContributionSchema>;
