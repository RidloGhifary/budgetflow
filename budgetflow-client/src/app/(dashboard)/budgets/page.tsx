"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Scale,
  Trash2,
  WalletCards
} from "lucide-react";

import { BudgetForm } from "@/components/budgets/budget-form";
import { MonthYearSelector, formatMonthYear, getCurrentMonthYear } from "@/components/shared/month-year-selector";
import { PaginationControls, useClientPagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressIndicator } from "@/components/shared/progress-indicator";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useBudgetSummary, useBudgets } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { getFriendlyApiError } from "@/lib/api/http";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { BudgetFormValues } from "@/lib/validation/budgets";
import { useToast } from "@/providers/toast-provider";
import type { BudgetSummaryItem } from "@/types/api";

export default function BudgetsPage() {
  const [period, setPeriod] = useState(getCurrentMonthYear);
  const budgetFilters = useMemo(
    () => ({
      month: period.month,
      year: period.year
    }),
    [period.month, period.year]
  );
  const { categories, errorMessage: categoryError, isLoading: isCategoriesLoading } = useCategories();
  const {
    budgets,
    createBudget,
    deleteBudget,
    errorMessage: budgetError,
    isLoading: isBudgetsLoading,
    reload: reloadBudgets,
    updateBudget
  } = useBudgets(budgetFilters);
  const {
    errorMessage: summaryError,
    isLoading: isSummaryLoading,
    reload: reloadSummary,
    summary
  } = useBudgetSummary(budgetFilters);
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetSummaryItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isLoading = isBudgetsLoading || isSummaryLoading;
  const errorMessage = budgetError || summaryError;
  const budgetItems = summary?.items ?? [];
  const overBudgetAmount = budgetItems.reduce((total, budget) => total + budget.overAmount, 0);
  const periodKey = `${period.month}-${period.year}`;
  const budgetPagination = useClientPagination(budgetItems, [periodKey]);

  const openCreateForm = () => {
    setEditingBudget(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (budget: BudgetSummaryItem) => {
    setEditingBudget(budget);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBudget(null);
    setFormError(null);
  };

  const reloadPage = async () => {
    await Promise.all([reloadBudgets(), reloadSummary()]);
  };

  const normalizeBudgetInput = (values: BudgetFormValues) => ({
    categoryId: values.categoryId,
    month: values.month,
    year: values.year,
    limitAmount: values.limitAmount
  });

  const handleSubmit = async (values: BudgetFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, normalizeBudgetInput(values));
        showToast({ title: "Budget updated", variant: "success" });
      } else {
        await createBudget(normalizeBudgetInput(values));
        showToast({ title: "Budget created", variant: "success" });
      }

      if (values.month !== period.month || values.year !== period.year) {
        setPeriod({ month: values.month, year: values.year });
      } else {
        await reloadSummary();
      }

      closeForm();
    } catch (error) {
      const message = getFriendlyApiError(error, editingBudget ? "updateBudget" : "createBudget");
      setFormError(message);
      showToast({ title: "Budget was not saved", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (budget: BudgetSummaryItem) => {
    const confirmed = window.confirm(
      `Delete ${budget.category.name} budget for ${formatMonthYear(budget.month, budget.year)}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(budget.id);

    try {
      await deleteBudget(budget.id);
      await reloadSummary();
      showToast({ title: "Budget deleted", variant: "success" });
    } catch (error) {
      showToast({
        title: "Budget was not deleted",
        description: getFriendlyApiError(error, "deleteBudget"),
        variant: "error"
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description={`Track expense-category limits for ${formatMonthYear(period.month, period.year)} using your budget totals.`}
        actions={
          <>
            <MonthYearSelector disabled={isLoading} month={period.month} onChange={setPeriod} year={period.year} />
            <Button disabled={isLoading} onClick={() => void reloadPage()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Create Budget
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total Limit"
          value={formatCurrency(summary?.totalLimitAmount ?? 0)}
          helper={`${budgetItems.length || budgets.length} budget${(budgetItems.length || budgets.length) === 1 ? "" : "s"} in this period`}
          icon={WalletCards}
          tone="primary"
        />
        <StatTile
          label="Used"
          value={formatCurrency(summary?.totalUsedAmount ?? 0)}
          helper={`${formatPercent(summary?.overallUsagePercentage ?? 0)} of planned spend`}
          icon={ReceiptText}
          tone={getBudgetTone(summary?.overallUsagePercentage ?? 0)}
        />
        <StatTile
          label="Remaining"
          value={formatCurrency(summary?.totalRemainingAmount ?? 0)}
          helper="Limit minus matched expenses"
          icon={Scale}
          tone={(summary?.totalRemainingAmount ?? 0) < 0 ? "danger" : "success"}
        />
        <StatTile
          label="Over Budget"
          value={formatCurrency(overBudgetAmount)}
          helper={`${summary?.overBudgetCount ?? 0} categor${(summary?.overBudgetCount ?? 0) === 1 ? "y" : "ies"} need attention`}
          icon={AlertTriangle}
          tone={(summary?.overBudgetCount ?? 0) > 0 ? "danger" : "blue"}
        />
      </section>

      {isFormOpen ? (
        <SectionCard
          title={editingBudget ? "Edit budget" : "Create budget"}
          description="Budgets are stored per expense category, month, and year."
        >
          <div className="space-y-4">
            {formError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            ) : null}
            <BudgetForm
              budget={editingBudget}
              categories={categories}
              categoryError={categoryError}
              isCategoriesLoading={isCategoriesLoading}
              isSubmitting={isSubmitting}
              onCancel={closeForm}
              onSubmit={handleSubmit}
              selectedMonth={period.month}
              selectedYear={period.year}
            />
          </div>
        </SectionCard>
      ) : null}

      {isLoading ? <BudgetsSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <SectionCard title="Could not load budgets" description={errorMessage}>
          <Button onClick={() => void reloadPage()} type="button">
            Retry
          </Button>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && budgetItems.length === 0 ? (
        <SectionCard
          title="No budgets for this month"
          description="Create limits for expense categories to compare planned spend with actual transactions."
          action={
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Create Budget
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">Budget usage appears here after a budget exists for the selected month.</p>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && budgetItems.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {budgetPagination.paginatedItems.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              deletingId={deletingId}
              onDelete={handleDelete}
              onEdit={openEditForm}
            />
          ))}
          <div className="lg:col-span-2">
            <PaginationControls
              onPageChange={budgetPagination.setPage}
              onPageSizeChange={budgetPagination.setPageSize}
              page={budgetPagination.page}
              pageSize={budgetPagination.pageSize}
              totalItems={budgetPagination.totalItems}
              totalPages={budgetPagination.totalPages}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface BudgetCardProps {
  budget: BudgetSummaryItem;
  deletingId: string | null;
  onDelete: (budget: BudgetSummaryItem) => void;
  onEdit: (budget: BudgetSummaryItem) => void;
}

function BudgetCard({ budget, deletingId, onDelete, onEdit }: BudgetCardProps) {
  const tone = budget.status === "OVER_BUDGET" ? "danger" : budget.status === "WARNING" ? "warning" : "success";
  const progressValue = Math.max(0, Math.min(Math.round(budget.usagePercentage), 100));

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Category</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: budget.category.color ?? "#007F68" }} />
            <h3 className="truncate text-lg font-semibold text-foreground">{budget.category.name}</h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={budget.status} />
          <Button aria-label="Edit budget" onClick={() => onEdit(budget)} size="icon" type="button" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Delete budget"
            disabled={deletingId === budget.id}
            onClick={() => onDelete(budget)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {deletingId === budget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
          </Button>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <BudgetAmount label="Limit" value={formatCurrency(budget.limitAmount)} />
          <BudgetAmount label="Used" value={formatCurrency(budget.usedAmount)} />
          <BudgetAmount
            label={budget.overAmount > 0 ? "Over" : "Remaining"}
            value={formatCurrency(budget.overAmount > 0 ? budget.overAmount : budget.remainingAmount)}
            tone={budget.overAmount > 0 ? "danger" : "default"}
          />
        </div>
        <ProgressIndicator
          value={progressValue}
          tone={tone}
          label={`${formatPercent(budget.usagePercentage)} used of ${formatCurrency(budget.limitAmount)}`}
        />
      </div>
    </div>
  );
}

function BudgetAmount({ label, tone = "default", value }: { label: string; tone?: "default" | "danger"; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`number-tabular mt-1 font-semibold ${tone === "danger" ? "text-red-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function BudgetsSkeleton() {
  return (
    <SectionCard title="Loading budgets" description="Loading budget limits and usage.">
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="h-5 w-36 animate-pulse rounded bg-muted" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="h-14 animate-pulse rounded bg-muted" />
              <div className="h-14 animate-pulse rounded bg-muted" />
              <div className="h-14 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-5 h-3 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function getBudgetTone(usagePercentage: number) {
  if (usagePercentage >= 100) {
    return "danger";
  }

  if (usagePercentage >= 80) {
    return "warning";
  }

  return "success";
}
