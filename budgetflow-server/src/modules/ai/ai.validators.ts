import { z } from "zod";

const monthSchema = z.number().int().min(1).max(12).optional();
const yearSchema = z.number().int().min(2000).max(2100).optional();

export const aiChatSchema = z
  .object({
    message: z.string().trim().min(1, "Message is required").max(500, "Message must be 500 characters or fewer"),
    month: monthSchema,
    year: yearSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (value.month && !value.year) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["year"],
        message: "Year is required when month is provided"
      });
    }

    if (value.year && !value.month) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["month"],
        message: "Month is required when year is provided"
      });
    }
  });

export type AiChatInput = z.infer<typeof aiChatSchema>;
