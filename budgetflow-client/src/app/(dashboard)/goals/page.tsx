"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleGauge,
  History,
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  WalletCards
} from "lucide-react";

import { GoalContributionForm } from "@/components/goals/goal-contribution-form";
import { GoalFilters } from "@/components/goals/goal-filters";
import { GoalForm } from "@/components/goals/goal-form";
import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { PaginationControls, useClientPagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressIndicator } from "@/components/shared/progress-indicator";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import { useGoalDetail, useGoalSummary, useGoals } from "@/hooks/use-goals";
import { useWallets } from "@/hooks/use-wallets";
import { getFriendlyApiError } from "@/lib/api/http";
import type { SavingContributionInput, SavingGoalFilters, SavingGoalInput } from "@/lib/api/goals.api";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { SavingContributionFormValues, SavingGoalFormValues } from "@/lib/validation/goals";
import { useToast } from "@/providers/toast-provider";
import type { SavingContribution, SavingGoal } from "@/types/api";

const emptyFilters: SavingGoalFilters = {
  status: "",
  search: "",
  deadlineBefore: "",
  deadlineAfter: ""
};

export default function SavingGoalsPage() {
  const [filters, setFilters] = useState<SavingGoalFilters>(emptyFilters);
  const {
    addContribution,
    createGoal,
    deleteGoal,
    errorMessage: goalsError,
    goals,
    isLoading: isGoalsLoading,
    reload: reloadGoals,
    updateGoal
  } = useGoals(filters);
  const {
    errorMessage: summaryError,
    isLoading: isSummaryLoading,
    reload: reloadSummary,
    summary
  } = useGoalSummary();
  const { categories, errorMessage: categoryError, isLoading: isCategoriesLoading } = useCategories();
  const { errorMessage: walletError, isLoading: isWalletsLoading, reload: reloadWallets, wallets } = useWallets();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<SavingGoal | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const {
    errorMessage: detailError,
    goal: detailedGoal,
    isLoading: isDetailLoading,
    reload: reloadDetail
  } = useGoalDetail(expandedGoalId);
  const [formError, setFormError] = useState<string | null>(null);
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContributionSubmitting, setIsContributionSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isLoading = isGoalsLoading || isSummaryLoading;
  const errorMessage = goalsError || summaryError;
  const hasActiveFilters = useMemo(() => Object.values(filters).some((value) => Boolean(value)), [filters]);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const goalPagination = useClientPagination(goals, [filterKey]);

  const openCreateForm = () => {
    setEditingGoal(null);
    setContributionGoal(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (goal: SavingGoal) => {
    setEditingGoal(goal);
    setContributionGoal(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingGoal(null);
    setFormError(null);
  };

  const openContributionForm = (goal: SavingGoal) => {
    setContributionGoal(goal);
    setIsFormOpen(false);
    setContributionError(null);
  };

  const closeContributionForm = () => {
    setContributionGoal(null);
    setContributionError(null);
  };

  const reloadPage = async () => {
    await Promise.all([reloadGoals(), reloadSummary()]);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
  };

  const normalizeGoalInput = (values: SavingGoalFormValues): SavingGoalInput => {
    const input: SavingGoalInput = {
      name: values.name.trim(),
      targetAmount: values.targetAmount,
      deadline: values.deadline || null,
      note: values.note?.trim() || null
    };

    if (values.status === "CANCELLED") {
      input.status = values.status;
    }

    return input;
  };

  const normalizeContributionInput = (values: SavingContributionFormValues): SavingContributionInput => ({
    amount: values.amount,
    walletId: values.walletId,
    categoryId: values.categoryId,
    contributionDate: values.contributionDate,
    note: values.note?.trim() || null
  });

  const handleGoalSubmit = async (values: SavingGoalFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, normalizeGoalInput(values));
        showToast({ title: "Saving goal updated", variant: "success" });

        if (expandedGoalId === editingGoal.id) {
          await reloadDetail();
        }
      } else {
        await createGoal(normalizeGoalInput(values));
        showToast({ title: "Saving goal created", variant: "success" });
      }

      await reloadSummary();
      closeForm();
    } catch (error) {
      const message = getFriendlyApiError(error, editingGoal ? "updateGoal" : "createGoal");
      setFormError(message);
      showToast({ title: "Saving goal was not saved", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContributionSubmit = async (values: SavingContributionFormValues) => {
    if (!contributionGoal) {
      return;
    }

    setIsContributionSubmitting(true);
    setContributionError(null);

    try {
      await addContribution(contributionGoal.id, normalizeContributionInput(values));
      await Promise.all([
        reloadSummary(),
        reloadWallets(),
        expandedGoalId === contributionGoal.id ? reloadDetail() : Promise.resolve()
      ]);
      showToast({ title: "Saving contribution added", variant: "success" });
      closeContributionForm();
    } catch (error) {
      const message = getFriendlyApiError(error, "addSavingContribution");
      setContributionError(message);
      showToast({ title: "Contribution was not added", description: message, variant: "error" });
    } finally {
      setIsContributionSubmitting(false);
    }
  };

  const handleDelete = async (goal: SavingGoal) => {
    const confirmed = window.confirm(`Delete ${goal.name}? Saving goals with contribution history may need to be reviewed first.`);

    if (!confirmed) {
      return;
    }

    setDeletingId(goal.id);

    try {
      await deleteGoal(goal.id);
      await reloadSummary();

      if (expandedGoalId === goal.id) {
        setExpandedGoalId(null);
      }

      showToast({ title: "Saving goal deleted", variant: "success" });
    } catch (error) {
      showToast({
        title: "Saving goal was not deleted",
        description: getFriendlyApiError(error, "deleteGoal"),
        variant: "error"
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saving Goals"
        description="Track saving targets, contribution history, wallet balance updates, and linked expense transactions."
        actions={
          <>
            <Button disabled={isLoading} onClick={() => void reloadPage()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Create Goal
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total Target"
          value={<SensitiveValue format="currency" value={summary?.totalTargetAmount ?? 0} />}
          helper={`${summary?.completedGoalsCount ?? 0} completed goals`}
          icon={Target}
          tone="primary"
        />
        <StatTile
          label="Total Saved"
          value={<SensitiveValue format="currency" value={summary?.totalSavedAmount ?? 0} />}
          helper={<SensitiveText text={`${formatPercent(summary?.averageProgressPercentage ?? 0)} average progress`} />}
          icon={PiggyBank}
          tone="success"
        />
        <StatTile
          label="Total Remaining"
          value={<SensitiveValue format="currency" value={summary?.totalRemainingAmount ?? 0} />}
          helper={`${summary?.cancelledGoalsCount ?? 0} cancelled goals`}
          icon={WalletCards}
          tone="blue"
        />
        <StatTile
          label="Active Goals"
          value={`${summary?.activeGoalsCount ?? 0}`}
          helper={`${summary?.dueSoonCount ?? 0} due soon, ${summary?.overdueCount ?? 0} overdue`}
          icon={(summary?.overdueCount ?? 0) > 0 ? AlertTriangle : CircleGauge}
          tone={(summary?.overdueCount ?? 0) > 0 ? "danger" : "primary"}
        />
      </section>

      {isFormOpen ? (
        <SectionCard
          title={editingGoal ? "Edit saving goal" : "Create saving goal"}
          description="Current amount and status are calculated from contributions."
        >
          <div className="space-y-4">
            {formError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            ) : null}
            <GoalForm goal={editingGoal} isSubmitting={isSubmitting} onCancel={closeForm} onSubmit={handleGoalSubmit} />
          </div>
        </SectionCard>
      ) : null}

      {contributionGoal ? (
        <SectionCard
          title="Add Saving Contribution"
          description=""
        >
          <p className="mb-4 text-sm text-muted-foreground">
            <SensitiveValue format="currency" value={contributionGoal.remainingAmount} /> remaining for {contributionGoal.name}.
          </p>
          <div className="space-y-4">
            {contributionError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{contributionError}</div>
            ) : null}
            <GoalContributionForm
              categories={categories}
              categoryError={categoryError}
              goal={contributionGoal}
              isCategoriesLoading={isCategoriesLoading}
              isSubmitting={isContributionSubmitting}
              isWalletsLoading={isWalletsLoading}
              onCancel={closeContributionForm}
              onSubmit={handleContributionSubmit}
              walletError={walletError}
              wallets={wallets}
            />
          </div>
        </SectionCard>
      ) : null}

      <GoalFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        isLoading={isGoalsLoading}
        onChange={setFilters}
        onClear={clearFilters}
      />

      {isLoading ? <GoalsSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <SectionCard title="Could not load saving goals" description={errorMessage}>
          <Button onClick={() => void reloadPage()} type="button">
            Retry
          </Button>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && goals.length === 0 ? (
        <SectionCard
          title={hasActiveFilters ? "No saving goals match your filters" : "No saving goals yet"}
          description={
            hasActiveFilters
              ? "Try clearing filters or widening the deadline range."
              : "Create your first saving goal to track progress through linked expense contributions."
          }
          action={
            hasActiveFilters ? (
              <Button onClick={clearFilters} type="button" variant="outline">
                Clear Filters
              </Button>
            ) : (
              <Button onClick={openCreateForm} type="button">
                <Plus className="h-4 w-4" />
                Create Goal
              </Button>
            )
          }
        >
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "No records match the current search and filters."
              : "Goal cards will show target amount, saved amount, remaining amount, deadline, status, and contribution history."}
          </p>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && goals.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {goalPagination.paginatedItems.map((goal) => (
            <SavingGoalCard
              key={goal.id}
              deletingId={deletingId}
              detail={expandedGoalId === goal.id ? detailedGoal : null}
              detailError={expandedGoalId === goal.id ? detailError : null}
              goal={goal}
              isDetailLoading={expandedGoalId === goal.id && isDetailLoading}
              isExpanded={expandedGoalId === goal.id}
              onContribution={openContributionForm}
              onDelete={handleDelete}
              onEdit={openEditForm}
              onReloadDetail={reloadDetail}
              onToggleDetail={(nextGoal) => setExpandedGoalId(expandedGoalId === nextGoal.id ? null : nextGoal.id)}
            />
          ))}
          <div className="xl:col-span-2">
            <PaginationControls
              onPageChange={goalPagination.setPage}
              onPageSizeChange={goalPagination.setPageSize}
              page={goalPagination.page}
              pageSize={goalPagination.pageSize}
              totalItems={goalPagination.totalItems}
              totalPages={goalPagination.totalPages}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface SavingGoalCardProps {
  deletingId: string | null;
  detail: { contributions: SavingContribution[] } | null;
  detailError: string | null;
  goal: SavingGoal;
  isDetailLoading: boolean;
  isExpanded: boolean;
  onContribution: (goal: SavingGoal) => void;
  onDelete: (goal: SavingGoal) => void;
  onEdit: (goal: SavingGoal) => void;
  onReloadDetail: () => Promise<void>;
  onToggleDetail: (goal: SavingGoal) => void;
}

function SavingGoalCard({
  deletingId,
  detail,
  detailError,
  goal,
  isDetailLoading,
  isExpanded,
  onContribution,
  onDelete,
  onEdit,
  onReloadDetail,
  onToggleDetail
}: SavingGoalCardProps) {
  const progress = getProgressValue(goal.progressPercentage);
  const isCompleted = goal.status === "COMPLETED";
  const isCancelled = goal.status === "CANCELLED";
  const overdue = isGoalOverdue(goal);
  const tone = isCompleted ? "success" : overdue ? "danger" : "primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-foreground">{goal.name}</h3>
            <StatusBadge status={goal.status} />
            {overdue ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Overdue</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatDeadline(goal.deadline)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label="Add saving contribution"
            disabled={isCancelled}
            onClick={() => onContribution(goal)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PiggyBank className="h-4 w-4" />
          </Button>
          <Button aria-label="Edit saving goal" onClick={() => onEdit(goal)} size="icon" type="button" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Delete saving goal"
            disabled={deletingId === goal.id}
            onClick={() => onDelete(goal)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {deletingId === goal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <GoalAmount label="Target" value={<SensitiveValue format="currency" value={goal.targetAmount} />} />
        <GoalAmount label="Saved" value={<SensitiveValue format="currency" value={goal.currentAmount} />} tone={isCompleted ? "success" : "default"} />
        <GoalAmount label="Remaining" value={<SensitiveValue format="currency" value={goal.remainingAmount} />} tone={goal.remainingAmount <= 0 ? "success" : "default"} />
      </div>

      <div className="mt-5">
        <ProgressIndicator
          value={progress}
          tone={tone}
          label={<SensitiveText text={`${formatPercent(goal.progressPercentage)} funded toward ${formatCurrency(goal.targetAmount)}`} />}
        />
      </div>

      {goal.note ? <p className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{goal.note}</p> : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {goal.contributionCount ?? 0} contribution{(goal.contributionCount ?? 0) === 1 ? "" : "s"} recorded
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={isCancelled} onClick={() => onContribution(goal)} type="button" variant="outline">
            <Plus className="h-4 w-4" />
            Add Contribution
          </Button>
          <Button onClick={() => onToggleDetail(goal)} type="button" variant="outline">
            <History className="h-4 w-4" />
            {isExpanded ? "Hide history" : "View history"}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <ContributionHistory
          contributions={detail?.contributions ?? []}
          errorMessage={detailError}
          isLoading={isDetailLoading}
          onRetry={onReloadDetail}
        />
      ) : null}
    </div>
  );
}

function GoalAmount({ label, tone = "default", value }: { label: string; tone?: "default" | "success"; value: ReactNode }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`number-tabular mt-1 font-semibold ${tone === "success" ? "text-emerald-700" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function ContributionHistory({
  contributions,
  errorMessage,
  isLoading,
  onRetry
}: {
  contributions: SavingContribution[];
  errorMessage: string | null;
  isLoading: boolean;
  onRetry: () => Promise<void>;
}) {
  if (isLoading) {
    return (
      <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
        <p>{errorMessage}</p>
        <Button className="mt-2" onClick={() => void onRetry()} type="button" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
        No contributions have been recorded yet.
      </div>
    );
  }

  return (
    <div className="mt-4 divide-y divide-border rounded-lg border border-border px-3">
      {contributions.map((contribution) => (
        <div key={contribution.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              <SensitiveValue format="currency" value={contribution.amount} />
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatDate(contribution.contributionDate)} - {contribution.transaction.wallet.name} - {contribution.transaction.category.name}
            </p>
          </div>
          <StatusBadge status={contribution.transaction.type} />
        </div>
      ))}
    </div>
  );
}

function GoalsSkeleton() {
  return (
    <SectionCard title="Loading saving goals" description="Loading saving goal records.">
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
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

function getProgressValue(progressPercentage: number) {
  return Math.min(Math.max(Math.round(progressPercentage), 0), 100);
}

function formatDeadline(value?: string | null) {
  return value ? `Deadline ${formatDate(value)}` : "No deadline";
}

function isGoalOverdue(goal: SavingGoal) {
  if (!goal.deadline || goal.status !== "IN_PROGRESS") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(goal.deadline);
  deadline.setHours(0, 0, 0, 0);

  return !Number.isNaN(deadline.getTime()) && deadline < today;
}
