import { CategoryType } from "@prisma/client";
import { z } from "zod";

const colorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Color must be a valid hex color")
  .optional();

export const categoryQuerySchema = z
  .object({
    type: z.nativeEnum(CategoryType).optional()
  })
  .strict();

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Category name is required").max(120, "Category name is too long"),
    type: z.nativeEnum(CategoryType, {
      errorMap: () => ({ message: "Category type is invalid" })
    }),
    icon: z.string().trim().max(80, "Icon is too long").optional(),
    color: colorSchema
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Category name is required").max(120, "Category name is too long").optional(),
    type: z
      .nativeEnum(CategoryType, {
        errorMap: () => ({ message: "Category type is invalid" })
      })
      .optional(),
    icon: z.string().trim().max(80, "Icon is too long").nullable().optional(),
    color: colorSchema.nullable().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
