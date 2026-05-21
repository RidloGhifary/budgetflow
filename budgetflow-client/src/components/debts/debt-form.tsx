"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debtTypeLabels } from "@/lib/labels";
import { debtSchema, debtTypeValues, type DebtFormValues } from "@/lib/validation/debts";
import type { Debt } from "@/types/api";

interface DebtFormProps {
  debt?: Debt | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: DebtFormValues) => Promise<void>;
}

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

function getDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function DebtForm({ debt, isSubmitting, onCancel, onSubmit }: DebtFormProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      type: debt?.type ?? "I_OWE",
      title: debt?.title ?? "",
      personName: debt?.personName ?? "",
      totalAmount: debt?.totalAmount ?? 0,
      dueDate: getDateInputValue(debt?.dueDate),
      note: debt?.note ?? ""
    }
  });

  useEffect(() => {
    reset({
      type: debt?.type ?? "I_OWE",
      title: debt?.title ?? "",
      personName: debt?.personName ?? "",
      totalAmount: debt?.totalAmount ?? 0,
      dueDate: getDateInputValue(debt?.dueDate),
      note: debt?.note ?? ""
    });
  }, [debt, reset]);

  const submitHandler: SubmitHandler<DebtFormValues> = async (values) => {
    await onSubmit(values);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submitHandler)}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Debt Type</span>
          <select className={selectClassName} {...register("type")}>
            {debtTypeValues.map((type) => (
              <option key={type} value={type}>
                {debtTypeLabels[type]}
              </option>
            ))}
          </select>
          {errors.type ? <p className="text-xs text-red-600">{errors.type.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Total Amount</span>
          <Input
            aria-invalid={Boolean(errors.totalAmount)}
            inputMode="numeric"
            min="0"
            placeholder="500000"
            step="10000"
            type="number"
            {...register("totalAmount")}
          />
          {errors.totalAmount ? <p className="text-xs text-red-600">{errors.totalAmount.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Title</span>
          <Input aria-invalid={Boolean(errors.title)} placeholder="Laptop installment" {...register("title")} />
          {errors.title ? <p className="text-xs text-red-600">{errors.title.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Person Name</span>
          <Input aria-invalid={Boolean(errors.personName)} placeholder="Budi" {...register("personName")} />
          {errors.personName ? <p className="text-xs text-red-600">{errors.personName.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Due Date</span>
          <Input aria-invalid={Boolean(errors.dueDate)} type="date" {...register("dueDate")} />
          {errors.dueDate ? <p className="text-xs text-red-600">{errors.dueDate.message}</p> : null}
        </label>

        <label className="block space-y-2 md:col-span-2 xl:col-span-3">
          <span className="text-sm font-medium text-foreground">Note</span>
          <Input placeholder="Optional context" {...register("note")} />
          {errors.note ? <p className="text-xs text-red-600">{errors.note.message}</p> : null}
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : debt ? "Update debt" : "Create debt"}
        </Button>
        <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}
