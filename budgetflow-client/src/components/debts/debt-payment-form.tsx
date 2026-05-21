"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debtTypeLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/format";
import { createDebtPaymentSchema, type DebtPaymentFormValues } from "@/lib/validation/debts";
import type { Category, Debt, Wallet } from "@/types/api";

interface DebtPaymentFormProps {
  categories: Category[];
  categoryError?: string | null;
  debt: Debt;
  isCategoriesLoading: boolean;
  isSubmitting: boolean;
  isWalletsLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: DebtPaymentFormValues) => Promise<void>;
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

export function DebtPaymentForm({
  categories,
  categoryError,
  debt,
  isCategoriesLoading,
  isSubmitting,
  isWalletsLoading,
  onCancel,
  onSubmit,
  walletError,
  wallets
}: DebtPaymentFormProps) {
  const requiredCategoryType = debt.type === "I_OWE" ? "EXPENSE" : "INCOME";
  const actionLabel = debt.type === "I_OWE" ? "payment" : "collection";
  const transactionTypeLabel = debt.type === "I_OWE" ? "expense" : "income";
  const schema = useMemo(() => createDebtPaymentSchema(debt.remainingAmount), [debt.remainingAmount]);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<DebtPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: debt.remainingAmount,
      walletId: "",
      categoryId: "",
      paymentDate: todayInputValue(),
      note: ""
    }
  });

  const matchingCategories = useMemo(
    () => categories.filter((category) => category.type === requiredCategoryType),
    [categories, requiredCategoryType]
  );
  const selectedCategoryId = watch("categoryId");

  useEffect(() => {
    reset({
      amount: debt.remainingAmount,
      walletId: "",
      categoryId: "",
      paymentDate: todayInputValue(),
      note: ""
    });
  }, [debt, reset]);

  useEffect(() => {
    if (
      !isCategoriesLoading &&
      selectedCategoryId &&
      !matchingCategories.some((category) => category.id === selectedCategoryId)
    ) {
      setValue("categoryId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [isCategoriesLoading, matchingCategories, selectedCategoryId, setValue]);

  const submitHandler: SubmitHandler<DebtPaymentFormValues> = async (values) => {
    await onSubmit(values);
  };

  const hasWallets = wallets.length > 0;
  const hasMatchingCategories = matchingCategories.length > 0;
  const isMissingSelectorData =
    isWalletsLoading || isCategoriesLoading || Boolean(walletError) || Boolean(categoryError) || !hasWallets || !hasMatchingCategories;

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submitHandler)}>
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        This {actionLabel} will be recorded as a linked {transactionTypeLabel} transaction for{" "}
        <span className="font-medium text-foreground">{debtTypeLabels[debt.type]}</span>.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Amount</span>
          <Input
            aria-invalid={Boolean(errors.amount)}
            inputMode="numeric"
            max={debt.remainingAmount}
            min="0"
            placeholder="250000"
            step="10000"
            type="number"
            {...register("amount")}
          />
          {errors.amount ? <p className="text-xs text-red-600">{errors.amount.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Payment Date</span>
          <Input aria-invalid={Boolean(errors.paymentDate)} type="date" {...register("paymentDate")} />
          {errors.paymentDate ? <p className="text-xs text-red-600">{errors.paymentDate.message}</p> : null}
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
          <span className="text-sm font-medium text-foreground">Category</span>
          <select
            className={selectClassName}
            disabled={isCategoriesLoading || Boolean(categoryError) || !hasMatchingCategories}
            {...register("categoryId")}
          >
            <option value="">
              {isCategoriesLoading ? "Loading categories..." : `Select ${transactionTypeLabel} category`}
            </option>
            {matchingCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId ? <p className="text-xs text-red-600">{errors.categoryId.message}</p> : null}
        </label>

        <label className="block space-y-2 md:col-span-2 xl:col-span-4">
          <span className="text-sm font-medium text-foreground">Note</span>
          <Input placeholder={`${debt.type === "I_OWE" ? "Paid" : "Collected"} for ${debt.title}`} {...register("note")} />
          {errors.note ? <p className="text-xs text-red-600">{errors.note.message}</p> : null}
        </label>
      </div>

      {walletError ? <SelectorMessage message={walletError} /> : null}
      {categoryError ? <SelectorMessage message={categoryError} /> : null}
      {!isWalletsLoading && !walletError && !hasWallets ? (
        <SelectorMessage
          message={
            <>
              Create a wallet before recording a debt {actionLabel}.{" "}
              <Link className="font-semibold text-primary hover:text-[#005F4F]" href="/wallets">
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
              Create an {transactionTypeLabel} category before recording this {actionLabel}.{" "}
              <Link className="font-semibold text-primary hover:text-[#005F4F]" href="/categories">
                Go to categories
              </Link>
            </>
          }
        />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={isSubmitting || isMissingSelectorData || debt.remainingAmount <= 0} type="submit">
          {isSubmitting ? "Saving..." : debt.type === "I_OWE" ? "Record payment" : "Record collection"}
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
