"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoryTypeLabels } from "@/lib/labels";
import { categorySchema, categoryTypeValues, type CategoryFormValues } from "@/lib/validation/categories";
import type { Category } from "@/types/api";

interface CategoryFormProps {
  category?: Category | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
}

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

export function CategoryForm({ category, isSubmitting, onCancel, onSubmit }: CategoryFormProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      type: category?.type ?? "EXPENSE",
      icon: category?.icon ?? "",
      color: category?.color ?? "#007F68"
    }
  });

  useEffect(() => {
    reset({
      name: category?.name ?? "",
      type: category?.type ?? "EXPENSE",
      icon: category?.icon ?? "",
      color: category?.color ?? "#007F68"
    });
  }, [category, reset]);

  const submitHandler: SubmitHandler<CategoryFormValues> = async (values) => {
    await onSubmit(values);
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(submitHandler)}>
      <label className="block space-y-2 md:col-span-2">
        <span className="text-sm font-medium text-foreground">Category name</span>
        <Input aria-invalid={Boolean(errors.name)} placeholder="Groceries" {...register("name")} />
        {errors.name ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Type</span>
        <select className={selectClassName} {...register("type")}>
          {categoryTypeValues.map((type) => (
            <option key={type} value={type}>
              {categoryTypeLabels[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Icon</span>
        <Input placeholder="shopping-bag" {...register("icon")} />
        {errors.icon ? <p className="text-xs text-red-600">{errors.icon.message}</p> : null}
      </label>

      <label className="block space-y-2 md:col-span-2">
        <span className="text-sm font-medium text-foreground">Color</span>
        <div className="flex gap-2">
          <Input aria-invalid={Boolean(errors.color)} placeholder="#007F68" {...register("color")} />
        </div>
        {errors.color ? <p className="text-xs text-red-600">{errors.color.message}</p> : null}
      </label>

      <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : category ? "Update category" : "Create category"}
        </Button>
        <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}
