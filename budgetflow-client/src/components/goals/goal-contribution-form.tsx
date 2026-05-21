"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { savingContributionSchema, type SavingContributionFormValues } from "@/lib/validation/goals";
import type { Category, SavingGoal, Wallet } from "@/types/api";

interface GoalContributionFormProps {
  categories: Category[];
  categoryError?: string | null;
  goal: SavingGoal;
  isCategoriesLoading: boolean;
  isSubmitting: boolean;
  isWalletsLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: SavingContributionFormValues) => Promise<void>;
  walletError?: string | null;
  wallets: Wallet[];
}

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

const todayInputValue = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export function GoalContributionForm({
  categories,
  categoryError,
  goal,
  isCategoriesLoading,
  isSubmitting,
  isWalletsLoading,
  onCancel,
  onSubmit,
  walletError,
  wallets
}: GoalContributionFormProps) {
  const expenseCategories = useMemo(() => categories.filter((category) => category.type === "EXPENSE"), [categories]);
  const defaultAmount = goal.remainingAmount > 0 ? goal.remainingAmount : 0;
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<SavingContributionFormValues>({
    resolver: zodResolver(savingContributionSchema),
    defaultValues: {
      amount: defaultAmount,
      walletId: "",
      categoryId: "",
      contributionDate: todayInputValue(),
      note: ""
    }
  });

  const selectedCategoryId = watch("categoryId");

  useEffect(() => {
    reset({
      amount: defaultAmount,
      walletId: "",
      categoryId: "",
      contributionDate: todayInputValue(),
      note: ""
    });
  }, [defaultAmount, goal.id, reset]);

  useEffect(() => {
    if (
      !isCategoriesLoading &&
      selectedCategoryId &&
      !expenseCategories.some((category) => category.id === selectedCategoryId)
    ) {
      setValue("categoryId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [expenseCategories, isCategoriesLoading, selectedCategoryId, setValue]);

  const submitHandler: SubmitHandler<SavingContributionFormValues> = async (values) => {
    await onSubmit(values);
  };

  const hasWallets = wallets.length > 0;
  const hasExpenseCategories = expenseCategories.length > 0;
  const isCancelled = goal.status === "CANCELLED";
  const isMissingSelectorData =
    isWalletsLoading || isCategoriesLoading || Boolean(walletError) || Boolean(categoryError) || !hasWallets || !hasExpenseCategories;

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submitHandler)}>
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        This will create an expense transaction, reduce the selected wallet balance, and update goal progress.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Amount</span>
          <Input
            aria-invalid={Boolean(errors.amount)}
            inputMode="numeric"
            min="0"
            placeholder="250000"
            step="10000"
            type="number"
            {...register("amount")}
          />
          {errors.amount ? <p className="text-xs text-red-600">{errors.amount.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Contribution Date</span>
          <Input aria-invalid={Boolean(errors.contributionDate)} type="date" {...register("contributionDate")} />
          {errors.contributionDate ? <p className="text-xs text-red-600">{errors.contributionDate.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Wallet</span>
          <select className={selectClassName} disabled={isWalletsLoading || Boolean(walletError) || !hasWallets} {...register("walletId")}>
            <option value="">{isWalletsLoading ? "Loading wallets..." : "Select wallet"}</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name} - {formatCurrency(wallet.currentBalance)}
              </option>
            ))}
          </select>
          {errors.walletId ? <p className="text-xs text-red-600">{errors.walletId.message}</p> : null}
        </label>

        <label className="block space-y-2">
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

        <label className="block space-y-2 md:col-span-2 xl:col-span-4">
          <span className="text-sm font-medium text-foreground">Note</span>
          <Input placeholder={`Contribution for ${goal.name}`} {...register("note")} />
          {errors.note ? <p className="text-xs text-red-600">{errors.note.message}</p> : null}
        </label>
      </div>

      {isCancelled ? <SelectorMessage message="Cancelled goals cannot accept contributions." /> : null}
      {walletError ? <SelectorMessage message={walletError} /> : null}
      {categoryError ? <SelectorMessage message={categoryError} /> : null}
      {!isWalletsLoading && !walletError && !hasWallets ? (
        <SelectorMessage
          message={
            <>
              Create a wallet before adding a saving contribution.{" "}
              <Link className="font-semibold text-primary hover:text-[#005F4F]" href="/wallets">
                Go to wallets
              </Link>
            </>
          }
        />
      ) : null}
      {!isCategoriesLoading && !categoryError && hasWallets && !hasExpenseCategories ? (
        <SelectorMessage
          message={
            <>
              Create an expense category before adding a saving contribution.{" "}
              <Link className="font-semibold text-primary hover:text-[#005F4F]" href="/categories">
                Go to categories
              </Link>
            </>
          }
        />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={isSubmitting || isMissingSelectorData || isCancelled} type="submit">
          {isSubmitting ? "Saving..." : "Add contribution"}
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
