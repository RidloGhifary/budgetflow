"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savingGoalSchema, type SavingGoalFormValues } from "@/lib/validation/goals";
import type { SavingGoal } from "@/types/api";

interface GoalFormProps {
  goal?: SavingGoal | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: SavingGoalFormValues) => Promise<void>;
}

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

function getDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function GoalForm({ goal, isSubmitting, onCancel, onSubmit }: GoalFormProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<SavingGoalFormValues>({
    resolver: zodResolver(savingGoalSchema),
    defaultValues: {
      name: goal?.name ?? "",
      targetAmount: goal?.targetAmount ?? 0,
      deadline: getDateInputValue(goal?.deadline),
      note: goal?.note ?? "",
      status: ""
    }
  });

  useEffect(() => {
    reset({
      name: goal?.name ?? "",
      targetAmount: goal?.targetAmount ?? 0,
      deadline: getDateInputValue(goal?.deadline),
      note: goal?.note ?? "",
      status: ""
    });
  }, [goal, reset]);

  const submitHandler: SubmitHandler<SavingGoalFormValues> = async (values) => {
    await onSubmit(values);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submitHandler)}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Goal Name</span>
          <Input aria-invalid={Boolean(errors.name)} placeholder="Emergency fund" {...register("name")} />
          {errors.name ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Target Amount</span>
          <Input
            aria-invalid={Boolean(errors.targetAmount)}
            inputMode="numeric"
            min="0"
            placeholder="10000000"
            step="10000"
            type="number"
            {...register("targetAmount")}
          />
          {errors.targetAmount ? <p className="text-xs text-red-600">{errors.targetAmount.message}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Deadline</span>
          <Input aria-invalid={Boolean(errors.deadline)} type="date" {...register("deadline")} />
          {errors.deadline ? <p className="text-xs text-red-600">{errors.deadline.message}</p> : null}
        </label>

        {goal && goal.status !== "CANCELLED" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Goal Status</span>
            <select className={selectClassName} {...register("status")}>
              <option value="">Keep current status</option>
              <option value="CANCELLED">Mark as cancelled</option>
            </select>
            {errors.status ? <p className="text-xs text-red-600">{errors.status.message}</p> : null}
          </label>
        ) : null}

        {goal?.status === "CANCELLED" ? (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            This goal is already cancelled and cannot be reopened.
          </div>
        ) : null}

        <label className="block space-y-2 md:col-span-2 xl:col-span-4">
          <span className="text-sm font-medium text-foreground">Note</span>
          <Input placeholder="Optional context" {...register("note")} />
          {errors.note ? <p className="text-xs text-red-600">{errors.note.message}</p> : null}
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : goal ? "Update goal" : "Create goal"}
        </Button>
        <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}
