"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { recurringFrequencyLabels, transactionTypeLabels } from "@/lib/labels";
import {
  recurringFrequencyValues,
  recurringTransactionSchema,
  recurringTransactionTypeValues,
  type RecurringTransactionFormValues
} from "@/lib/validation/recurring-transactions";
import { usePreferences } from "@/providers/preferences-provider";
import type { Category, RecurringTransaction, Wallet } from "@/types/api";

interface RecurringTransactionFormProps {
  categories: Category[];
  categoryError?: string | null;
  isCategoriesLoading: boolean;
  isSubmitting: boolean;
  isWalletsLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: RecurringTransactionFormValues) => Promise<void>;
  recurringTransaction?: RecurringTransaction | null;
  walletError?: string | null;
  wallets: Wallet[];
}

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

export function RecurringTransactionForm({
  categories,
  categoryError,
  isCategoriesLoading,
  isSubmitting,
  isWalletsLoading,
  onCancel,
  onSubmit,
  recurringTransaction,
  walletError,
  wallets
}: RecurringTransactionFormProps) {
  const { privacyModeEnabled } = usePreferences();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<RecurringTransactionFormValues>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: getDefaultValues(recurringTransaction)
  });

  const selectedType = watch("type");
  const selectedCategoryId = watch("categoryId");
  const matchingCategories = useMemo(
    () => categories.filter((category) => category.type === selectedType),
    [categories, selectedType]
  );

  useEffect(() => {
    reset(getDefaultValues(recurringTransaction));
  }, [recurringTransaction, reset]);

  useEffect(() => {
    if (
      !isCategoriesLoading &&
      selectedCategoryId &&
      !matchingCategories.some((category) => category.id === selectedCategoryId)
    ) {
      setValue("categoryId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [isCategoriesLoading, matchingCategories, selectedCategoryId, setValue]);

  const submitHandler: SubmitHandler<RecurringTransactionFormValues> = async (values) => {
    await onSubmit(values);
  };

  const hasWallets = wallets.length > 0;
  const hasMatchingCategories = matchingCategories.length > 0;
  const isMissingSelectorData =
    isWalletsLoading || isCategoriesLoading || Boolean(walletError) || Boolean(categoryError) || !hasWallets || !hasMatchingCategories;

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submitHandler)}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Name</span>
          <Input aria-invalid={Boolean(errors.name)} placeholder="Netflix, salary, rent..." {...register("name")} />
          {errors.name ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Type</span>
          <select className={selectClassName} {...register("type")}>
            {recurringTransactionTypeValues.map((type) => (
              <option key={type} value={type}>
                {transactionTypeLabels[type]}
              </option>
            ))}
          </select>
          {errors.type ? <p className="text-xs text-red-600">{errors.type.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Amount</span>
          <Input
            aria-invalid={Boolean(errors.amount)}
            inputMode="numeric"
            min="0"
            placeholder="149000"
            step="1000"
            type="number"
            {...register("amount")}
          />
          {errors.amount ? <p className="text-xs text-red-600">{errors.amount.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Wallet</span>
          <select className={selectClassName} disabled={isWalletsLoading || Boolean(walletError) || !hasWallets} {...register("walletId")}>
            <option value="">{isWalletsLoading ? "Loading wallets..." : "Select wallet"}</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name} - {privacyModeEnabled ? "Rp *****" : formatCurrency(wallet.currentBalance)}
              </option>
            ))}
          </select>
          {errors.walletId ? <p className="text-xs text-red-600">{errors.walletId.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Category</span>
          <select
            className={selectClassName}
            disabled={isCategoriesLoading || Boolean(categoryError) || !hasMatchingCategories}
            {...register("categoryId")}
          >
            <option value="">{isCategoriesLoading ? "Loading categories..." : `Select ${transactionTypeLabels[selectedType].toLowerCase()} category`}</option>
            {matchingCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId ? <p className="text-xs text-red-600">{errors.categoryId.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Frequency</span>
          <select className={selectClassName} {...register("frequency")}>
            {recurringFrequencyValues.map((frequency) => (
              <option key={frequency} value={frequency}>
                {recurringFrequencyLabels[frequency]}
              </option>
            ))}
          </select>
          {errors.frequency ? <p className="text-xs text-red-600">{errors.frequency.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Every</span>
          <Input aria-invalid={Boolean(errors.interval)} min="1" step="1" type="number" {...register("interval")} />
          {errors.interval ? <p className="text-xs text-red-600">{errors.interval.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Start date</span>
          <Input aria-invalid={Boolean(errors.startDate)} type="date" {...register("startDate")} />
          {errors.startDate ? <p className="text-xs text-red-600">{errors.startDate.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">End date</span>
          <Input aria-invalid={Boolean(errors.endDate)} type="date" {...register("endDate")} />
          {errors.endDate ? <p className="text-xs text-red-600">{errors.endDate.message}</p> : null}
        </label>

        <label className="block space-y-2 md:col-span-2 xl:col-span-3">
          <span className="text-sm font-medium text-foreground">Note</span>
          <Input placeholder="Optional memo for generated transactions" {...register("note")} />
          {errors.note ? <p className="text-xs text-red-600">{errors.note.message}</p> : null}
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-border p-3 md:col-span-2 xl:col-span-3">
          <input className="mt-1 h-4 w-4 accent-primary" type="checkbox" {...register("autoGenerate")} />
          <span>
            <span className="block text-sm font-medium text-foreground">Auto-generate when due</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              The backend generation service can process this rule when its next run date is due.
            </span>
          </span>
        </label>
      </div>

      {walletError ? <SelectorMessage message={walletError} /> : null}
      {categoryError ? <SelectorMessage message={categoryError} /> : null}
      {!isWalletsLoading && !walletError && !hasWallets ? (
        <SelectorMessage
          message={
            <>
              Create a wallet before creating recurring transactions.{" "}
              <Link className="font-semibold text-primary hover:text-primary/80" href="/wallets">
                Go to wallets
              </Link>
            </>
          }
        />
      ) : null}
      {!isCategoriesLoading && !categoryError && hasWallets && !hasMatchingCategories ? (
        <SelectorMessage
          message={
            <>
              Create a {transactionTypeLabels[selectedType].toLowerCase()} category before using this type.{" "}
              <Link className="font-semibold text-primary hover:text-primary/80" href="/categories">
                Go to categories
              </Link>
            </>
          }
        />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={isSubmitting || isMissingSelectorData} type="submit">
          {isSubmitting ? "Saving..." : recurringTransaction ? "Update recurring transaction" : "Create recurring transaction"}
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

function getDefaultValues(recurringTransaction?: RecurringTransaction | null): RecurringTransactionFormValues {
  return {
    amount: recurringTransaction?.amount ?? 0,
    autoGenerate: recurringTransaction?.autoGenerate ?? true,
    categoryId: recurringTransaction?.categoryId ?? "",
    endDate: recurringTransaction?.endDate ? recurringTransaction.endDate.slice(0, 10) : "",
    frequency: recurringTransaction?.frequency ?? "MONTHLY",
    interval: recurringTransaction?.interval ?? 1,
    name: recurringTransaction?.name ?? "",
    note: recurringTransaction?.note ?? "",
    startDate: recurringTransaction?.startDate ? recurringTransaction.startDate.slice(0, 10) : todayInputValue(),
    type: recurringTransaction?.type ?? "EXPENSE",
    walletId: recurringTransaction?.walletId ?? ""
  };
}

function todayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
