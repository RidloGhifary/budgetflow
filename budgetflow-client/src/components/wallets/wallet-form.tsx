"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { walletTypeLabels } from "@/lib/labels";
import { walletSchema, walletTypeValues, type WalletFormValues } from "@/lib/validation/wallets";
import type { Wallet } from "@/types/api";

interface WalletFormProps {
  wallet?: Wallet | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: WalletFormValues) => Promise<void>;
}

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

export function WalletForm({ wallet, isSubmitting, onCancel, onSubmit }: WalletFormProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      name: wallet?.name ?? "",
      type: wallet?.type ?? "CASH",
      initialBalance: wallet?.initialBalance
    }
  });

  useEffect(() => {
    reset({
      name: wallet?.name ?? "",
      type: wallet?.type ?? "CASH",
      initialBalance: wallet?.initialBalance
    });
  }, [reset, wallet]);

  const submitHandler: SubmitHandler<WalletFormValues> = async (values) => {
    await onSubmit(values);
  };

  return (
    <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit(submitHandler)}>
      <label className="block space-y-2 md:col-span-3">
        <span className="text-sm font-medium text-foreground">Wallet name</span>
        <Input aria-invalid={Boolean(errors.name)} placeholder="Main bank account" {...register("name")} />
        {errors.name ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Type</span>
        <select className={selectClassName} {...register("type")}>
          {walletTypeValues.map((type) => (
            <option key={type} value={type}>
              {walletTypeLabels[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2 md:col-span-2">
        <span className="text-sm font-medium text-foreground">Initial balance</span>
        <AmountInput
          aria-invalid={Boolean(errors.initialBalance)}
          placeholder="1500000"
          {...register("initialBalance")}
        />
        {errors.initialBalance ? <p className="text-xs text-red-600">{errors.initialBalance.message}</p> : null}
      </label>

      <div className="flex flex-col gap-2 sm:flex-row md:col-span-3">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : wallet ? "Update wallet" : "Create wallet"}
        </Button>
        <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}
