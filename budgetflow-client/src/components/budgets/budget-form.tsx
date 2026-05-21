"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { budgetSchema, type BudgetFormValues } from "@/lib/validation/budgets";
import type { Budget, Category } from "@/types/api";

interface BudgetFormProps {
  budget?: Budget | null;
  categories: Category[];
  categoryError?: string | null;
  isCategoriesLoading: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: BudgetFormValues) => Promise<void>;
  selectedMonth: number;
  selectedYear: number;
}

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function BudgetForm({
  budget,
  categories,
  categoryError,
  isCategoriesLoading,
  isSubmitting,
  onCancel,
  onSubmit,
  selectedMonth,
  selectedYear
}: BudgetFormProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: budget?.categoryId ?? "",
      month: budget?.month ?? selectedMonth,
      year: budget?.year ?? selectedYear,
      limitAmount: budget?.limitAmount ?? 0
    }
  });

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "EXPENSE"),
    [categories]
  );
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, index) => currentYear - 4 + index);

  useEffect(() => {
    reset({
      categoryId: budget?.categoryId ?? "",
      month: budget?.month ?? selectedMonth,
      year: budget?.year ?? selectedYear,
      limitAmount: budget?.limitAmount ?? 0
    });
  }, [budget, reset, selectedMonth, selectedYear]);

  const submitHandler: SubmitHandler<BudgetFormValues> = async (values) => {
    await onSubmit(values);
  };

  const hasExpenseCategories = expenseCategories.length > 0;
  const isMissingSelectorData = isCategoriesLoading || Boolean(categoryError) || !hasExpenseCategories;

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submitHandler)}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2 xl:col-span-2">
          <span className="text-sm font-medium text-foreground">Expense Category</span>
          <select
            className={selectClassName}
            disabled={isCategoriesLoading || Boolean(categoryError) || !hasExpenseCategories}
            {...register("categoryId")}
          >
            <option value="">{isCategoriesLoading ? "Loading categories..." : "Select expense category"}</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId ? <p className="text-xs text-red-600">{errors.categoryId.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Month</span>
          <select className={selectClassName} {...register("month")}>
            {monthOptions.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
          {errors.month ? <p className="text-xs text-red-600">{errors.month.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Year</span>
          <select className={selectClassName} {...register("year")}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {errors.year ? <p className="text-xs text-red-600">{errors.year.message}</p> : null}
        </label>

        <label className="block space-y-2 md:col-span-2 xl:col-span-4">
          <span className="text-sm font-medium text-foreground">Limit Amount</span>
          <Input
            aria-invalid={Boolean(errors.limitAmount)}
            inputMode="numeric"
            min="0"
            placeholder="2500000"
            step="10000"
            type="number"
            {...register("limitAmount")}
          />
          {errors.limitAmount ? <p className="text-xs text-red-600">{errors.limitAmount.message}</p> : null}
        </label>
      </div>

      {categoryError ? <SelectorMessage message={categoryError} /> : null}
      {!isCategoriesLoading && !categoryError && !hasExpenseCategories ? (
        <SelectorMessage
          message={
            <>
              Create an expense category before setting a budget.{" "}
              <Link className="font-semibold text-primary hover:text-[#005F4F]" href="/categories">
                Go to categories
              </Link>
            </>
          }
        />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={isSubmitting || isMissingSelectorData} type="submit">
          {isSubmitting ? "Saving..." : budget ? "Update budget" : "Create budget"}
        </Button>
        <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SelectorMessage({ message }: { message: ReactNode }) {
  return <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div>;
}
