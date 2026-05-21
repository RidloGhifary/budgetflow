"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transactionPurposeLabels, transactionTypeLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/format";
import {
  transactionPurposeValues,
  transactionSchema,
  transactionTypeValues,
  type TransactionFormValues
} from "@/lib/validation/transactions";
import type { Category, Transaction, TransactionPurpose, TransactionType, Wallet } from "@/types/api";

interface TransactionFormProps {
  categories: Category[];
  categoryError?: string | null;
  isCategoriesLoading: boolean;
  isSubmitting: boolean;
  isWalletsLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  transaction?: Transaction | null;
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

const getTransactionDateInputValue = (value?: string) => {
  if (!value) {
    return todayInputValue();
  }

  return value.slice(0, 10);
};

function getPurposeType(purpose: TransactionPurpose): TransactionType | null {
  if (purpose === "DEBT_COLLECTION") {
    return "INCOME";
  }

  if (purpose === "DEBT_PAYMENT" || purpose === "SAVING_CONTRIBUTION") {
    return "EXPENSE";
  }

  return null;
}

export function TransactionForm({
  categories,
  categoryError,
  isCategoriesLoading,
  isSubmitting,
  isWalletsLoading,
  onCancel,
  onSubmit,
  transaction,
  walletError,
  wallets
}: TransactionFormProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      walletId: transaction?.walletId ?? "",
      categoryId: transaction?.categoryId ?? "",
      type: transaction?.type ?? "EXPENSE",
      purpose: transaction?.purpose ?? "NORMAL",
      amount: transaction?.amount ?? 0,
      transactionDate: getTransactionDateInputValue(transaction?.transactionDate),
      note: transaction?.note ?? ""
    }
  });

  const selectedType = watch("type");
  const selectedPurpose = watch("purpose");
  const selectedCategoryId = watch("categoryId");

  const matchingCategories = useMemo(
    () => categories.filter((category) => category.type === selectedType),
    [categories, selectedType]
  );

  useEffect(() => {
    reset({
      walletId: transaction?.walletId ?? "",
      categoryId: transaction?.categoryId ?? "",
      type: transaction?.type ?? "EXPENSE",
      purpose: transaction?.purpose ?? "NORMAL",
      amount: transaction?.amount ?? 0,
      transactionDate: getTransactionDateInputValue(transaction?.transactionDate),
      note: transaction?.note ?? ""
    });
  }, [reset, transaction]);

  useEffect(() => {
    const requiredType = getPurposeType(selectedPurpose);

    if (requiredType && selectedType !== requiredType) {
      setValue("type", requiredType, { shouldDirty: true, shouldValidate: true });
    }
  }, [selectedPurpose, selectedType, setValue]);

  useEffect(() => {
    if (
      !isCategoriesLoading &&
      selectedCategoryId &&
      !matchingCategories.some((category) => category.id === selectedCategoryId)
    ) {
      setValue("categoryId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [isCategoriesLoading, matchingCategories, selectedCategoryId, setValue]);

  const submitHandler: SubmitHandler<TransactionFormValues> = async (values) => {
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
          <span className="text-sm font-medium text-foreground">Type</span>
          <select className={selectClassName} {...register("type")}>
            {transactionTypeValues.map((type) => (
              <option key={type} value={type}>
                {transactionTypeLabels[type]}
              </option>
            ))}
          </select>
          {errors.type ? <p className="text-xs text-red-600">{errors.type.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Purpose</span>
          <select className={selectClassName} {...register("purpose")}>
            {transactionPurposeValues.map((purpose) => (
              <option key={purpose} value={purpose}>
                {transactionPurposeLabels[purpose]}
              </option>
            ))}
          </select>
          {errors.purpose ? <p className="text-xs text-red-600">{errors.purpose.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Amount</span>
          <Input
            aria-invalid={Boolean(errors.amount)}
            inputMode="numeric"
            min="0"
            placeholder="75000"
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
          <span className="text-sm font-medium text-foreground">Date</span>
          <Input aria-invalid={Boolean(errors.transactionDate)} type="date" {...register("transactionDate")} />
          {errors.transactionDate ? <p className="text-xs text-red-600">{errors.transactionDate.message}</p> : null}
        </label>

        <label className="block space-y-2 md:col-span-2 xl:col-span-3">
          <span className="text-sm font-medium text-foreground">Note</span>
          <Input placeholder="Lunch, salary, groceries..." {...register("note")} />
          {errors.note ? <p className="text-xs text-red-600">{errors.note.message}</p> : null}
        </label>
      </div>

      {walletError ? <SelectorMessage message={walletError} /> : null}
      {categoryError ? <SelectorMessage message={categoryError} /> : null}
      {!isWalletsLoading && !walletError && !hasWallets ? (
        <SelectorMessage
          message={
            <>
              Create a wallet before adding transactions.{" "}
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
              Create a {transactionTypeLabels[selectedType].toLowerCase()} category before adding this transaction.{" "}
              <Link className="font-semibold text-primary hover:text-[#005F4F]" href="/categories">
                Go to categories
              </Link>
            </>
          }
        />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={isSubmitting || isMissingSelectorData} type="submit">
          {isSubmitting ? "Saving..." : transaction ? "Update transaction" : "Create transaction"}
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
