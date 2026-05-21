import { z } from "zod";

export const categoryTypeValues = ["INCOME", "EXPENSE"] as const;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
  type: z.enum(categoryTypeValues),
  icon: z.string().trim().max(80, "Icon is too long.").optional(),
  color: z
    .string()
    .trim()
    .refine((value) => value === "" || /^#(?:[0-9A-Fa-f]{3}){1,2}$/.test(value), {
      message: "Use a hex color like #007F68."
    })
    .optional()
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
