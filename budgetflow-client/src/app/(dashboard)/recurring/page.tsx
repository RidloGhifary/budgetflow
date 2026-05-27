"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  Eye,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  Sparkles,
  Trash2
} from "lucide-react";

import { RecurringTransactionForm } from "@/components/recurring-transactions/recurring-transaction-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import {
  useRecurringTransactionDetail,
  useRecurringTransactions
} from "@/hooks/use-recurring-transactions";
import { useWallets } from "@/hooks/use-wallets";
import type { RecurringTransactionFilters, RecurringTransactionInput } from "@/lib/api/recurring-transactions.api";
import { getFriendlyApiError } from "@/lib/api/http";
import { formatDate, formatDateTime } from "@/lib/format";
import { recurringFrequencyLabels, transactionTypeLabels } from "@/lib/labels";
import type { RecurringTransactionFormValues } from "@/lib/validation/recurring-transactions";
import { useToast } from "@/providers/toast-provider";
import type {
  RecurringGeneratedTransaction,
  RecurringTransaction,
  RecurringTransactionFrequency,
  RecurringTransactionStatus,
  TransactionType
} from "@/types/api";

const emptyFilters: RecurringTransactionFilters = {
  status: "",
  type: "",
  frequency: "",
  sortBy: "nextRunDate",
  sortDirection: "asc"
};

type PendingAction =
  | { type: "pause"; recurringTransaction: RecurringTransaction }
  | { type: "resume"; recurringTransaction: RecurringTransaction }
  | { type: "cancel"; recurringTransaction: RecurringTransaction }
  | { type: "generate"; recurringTransaction: RecurringTransaction }
  | { type: "generateDue" }
  | null;

export default function RecurringTransactionsPage() {
  const [filters, setFilters] = useState<RecurringTransactionFilters>(emptyFilters);
  const {
    cancelRecurringTransaction,
    createRecurringTransaction,
    errorMessage,
    generateDueRecurringTransactions,
    generateRecurringTransaction,
    isLoading,
    pauseRecurringTransaction,
    recurringTransactions,
    reload,
    resumeRecurringTransaction,
    updateRecurringTransaction
  } = useRecurringTransactions(filters);
  const { categories, errorMessage: categoryError, isLoading: isCategoriesLoading } = useCategories();
  const { errorMessage: walletError, isLoading: isWalletsLoading, wallets } = useWallets();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecurringTransaction, setEditingRecurringTransaction] = useState<RecurringTransaction | null>(null);
  const [selectedRecurringTransactionId, setSelectedRecurringTransactionId] = useState<string | null>(null);
  const {
    errorMessage: detailError,
    isLoading: isDetailLoading,
    recurringTransaction: detail,
    reload: reloadDetail
  } = useRecurringTransactionDetail(selectedRecurringTransactionId);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const summary = useMemo(() => {
    const activeCount = recurringTransactions.filter((item) => item.status === "ACTIVE").length;
    const dueSoonCount = recurringTransactions.filter((item) => isDueSoon(item.nextRunDate)).length;

    return {
      activeCount,
      dueSoonCount,
      monthlyAmount: recurringTransactions
        .filter((item) => item.status === "ACTIVE" && item.frequency === "MONTHLY")
        .reduce((total, item) => total + item.amount, 0),
      totalCount: recurringTransactions.length
    };
  }, [recurringTransactions]);

  const openCreateForm = () => {
    setEditingRecurringTransaction(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (recurringTransaction: RecurringTransaction) => {
    setEditingRecurringTransaction(recurringTransaction);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRecurringTransaction(null);
    setFormError(null);
  };

  const normalizeInput = (values: RecurringTransactionFormValues): RecurringTransactionInput => ({
    amount: values.amount,
    autoGenerate: values.autoGenerate,
    categoryId: values.categoryId,
    endDate: values.endDate || null,
    frequency: values.frequency,
    interval: values.interval,
    name: values.name.trim(),
    note: values.note?.trim() || null,
    startDate: values.startDate,
    type: values.type,
    walletId: values.walletId
  });

  const handleSubmit = async (values: RecurringTransactionFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const input = normalizeInput(values);

      if (editingRecurringTransaction) {
        await updateRecurringTransaction(editingRecurringTransaction.id, input);
        showToast({ title: "Recurring transaction updated", variant: "success" });
      } else {
        const created = await createRecurringTransaction(input);
        setSelectedRecurringTransactionId(created.id);
        showToast({ title: "Recurring transaction created", variant: "success" });
      }

      if (selectedRecurringTransactionId) {
        await reloadDetail();
      }

      closeForm();
    } catch (error) {
      const message = getFriendlyApiError(error, "updateRecurringTransaction");
      setFormError(message);
      showToast({ title: "Recurring transaction was not saved", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    setIsConfirming(true);

    try {
      if (pendingAction.type === "pause") {
        await pauseRecurringTransaction(pendingAction.recurringTransaction.id);
        showToast({ title: "Recurring transaction paused", variant: "success" });
      } else if (pendingAction.type === "resume") {
        await resumeRecurringTransaction(pendingAction.recurringTransaction.id);
        showToast({ title: "Recurring transaction resumed", variant: "success" });
      } else if (pendingAction.type === "cancel") {
        await cancelRecurringTransaction(pendingAction.recurringTransaction.id);
        showToast({ title: "Recurring transaction cancelled", variant: "success" });
      } else if (pendingAction.type === "generate") {
        const result = await generateRecurringTransaction(pendingAction.recurringTransaction.id);
        showToast({
          title: result.generated ? "Transaction generated" : "Already generated",
          description: result.reason,
          variant: result.generated ? "success" : "info"
        });
      } else {
        const result = await generateDueRecurringTransactions();
        showToast({
          title: "Due rules processed",
          description: `${result.generatedCount} generated, ${result.skippedCount} skipped.`,
          variant: "success"
        });
      }

      if (selectedRecurringTransactionId) {
        await reloadDetail();
      }

      setPendingAction(null);
    } catch (error) {
      showToast({
        title: "Recurring action failed",
        description: getFriendlyApiError(error, "generateRecurringTransaction"),
        variant: "error"
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const clearFilters = () => setFilters(emptyFilters);
  const hasActiveFilters = Object.values(filters).some((value) => value && value !== "nextRunDate" && value !== "asc");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Transactions"
        description="Create repeatable income and expense rules, then generate safe linked transactions when they are due."
        actions={
          <>
            <Button disabled={isLoading} onClick={() => void reload()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button disabled={isLoading || recurringTransactions.length === 0} onClick={() => setPendingAction({ type: "generateDue" })} type="button" variant="outline">
              <Sparkles className="h-4 w-4" />
              Generate Due
            </Button>
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Create Recurring
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Repeat2} label="Rules" value={`${summary.totalCount}`} helper="Recurring templates" />
        <StatTile icon={Play} label="Active" value={`${summary.activeCount}`} helper="Eligible to generate" tone="success" />
        <StatTile icon={CalendarClock} label="Due Soon" value={`${summary.dueSoonCount}`} helper="Within the next 7 days" tone="warning" />
        <StatTile
          icon={Clock3}
          label="Monthly Scheduled"
          value={<SensitiveValue format="currency" value={summary.monthlyAmount} />}
          helper="Active monthly rules"
        />
      </section>

      <SectionCard title="Filters" description="Narrow recurring rules by status, type, and cadence.">
        <div className="grid gap-3 md:grid-cols-4">
          <FilterSelect
            label="Status"
            onChange={(value) => setFilters((current) => ({ ...current, status: value as RecurringTransactionStatus | "" }))}
            value={filters.status ?? ""}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </FilterSelect>
          <FilterSelect
            label="Type"
            onChange={(value) => setFilters((current) => ({ ...current, type: value as TransactionType | "" }))}
            value={filters.type ?? ""}
          >
            <option value="">All types</option>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </FilterSelect>
          <FilterSelect
            label="Frequency"
            onChange={(value) => setFilters((current) => ({ ...current, frequency: value as RecurringTransactionFrequency | "" }))}
            value={filters.frequency ?? ""}
          >
            <option value="">All frequencies</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </FilterSelect>
          <FilterSelect
            label="Sort"
            onChange={(value) => setFilters((current) => ({ ...current, sortBy: value as RecurringTransactionFilters["sortBy"] }))}
            value={filters.sortBy ?? "nextRunDate"}
          >
            <option value="nextRunDate">Next run</option>
            <option value="createdAt">Created</option>
            <option value="amount">Amount</option>
            <option value="name">Name</option>
          </FilterSelect>
        </div>
        {hasActiveFilters ? (
          <Button className="mt-4" onClick={clearFilters} type="button" variant="outline">
            Clear filters
          </Button>
        ) : null}
      </SectionCard>

      {isFormOpen ? (
        <SectionCard
          title={editingRecurringTransaction ? "Edit recurring transaction" : "Create recurring transaction"}
          description="Generated transactions use a snapshot of this rule and stay linked for history."
        >
          <div className="space-y-4">
            {formError ? <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div> : null}
            <RecurringTransactionForm
              categories={categories}
              categoryError={categoryError}
              isCategoriesLoading={isCategoriesLoading}
              isSubmitting={isSubmitting}
              isWalletsLoading={isWalletsLoading}
              onCancel={closeForm}
              onSubmit={handleSubmit}
              recurringTransaction={editingRecurringTransaction}
              walletError={walletError}
              wallets={wallets}
            />
          </div>
        </SectionCard>
      ) : null}

      {isLoading ? <RecurringSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <SectionCard title="Could not load recurring transactions" description={errorMessage}>
          <Button onClick={() => void reload()} type="button">
            Retry
          </Button>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && recurringTransactions.length === 0 ? (
        <SectionCard
          title={hasActiveFilters ? "No recurring transactions match your filters" : "No recurring transactions yet"}
          description={hasActiveFilters ? "Clear filters or try another status." : "Create recurring rules for salary, rent, subscriptions, bills, or allowances."}
          action={
            hasActiveFilters ? (
              <Button onClick={clearFilters} type="button" variant="outline">
                Clear filters
              </Button>
            ) : (
              <Button onClick={openCreateForm} type="button">
                <Plus className="h-4 w-4" />
                Create recurring transaction
              </Button>
            )
          }
        >
          <p className="text-sm text-muted-foreground">Recurring rules will show schedule, amount, status, and generation history here.</p>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && recurringTransactions.length > 0 ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <SectionCard title="Recurring Rules" description={`${recurringTransactions.length} recurring rule${recurringTransactions.length === 1 ? "" : "s"} in the current view.`}>
            <div className="space-y-3">
              {recurringTransactions.map((recurringTransaction) => (
                <RecurringTransactionRow
                  key={recurringTransaction.id}
                  isSelected={selectedRecurringTransactionId === recurringTransaction.id}
                  onCancel={(item) => setPendingAction({ type: "cancel", recurringTransaction: item })}
                  onEdit={openEditForm}
                  onGenerate={(item) => setPendingAction({ type: "generate", recurringTransaction: item })}
                  onPause={(item) => setPendingAction({ type: "pause", recurringTransaction: item })}
                  onResume={(item) => setPendingAction({ type: "resume", recurringTransaction: item })}
                  onSelect={(item) => setSelectedRecurringTransactionId(item.id)}
                  recurringTransaction={recurringTransaction}
                />
              ))}
            </div>
          </SectionCard>

          <RecurringDetailPanel
            detail={detail}
            errorMessage={detailError}
            isLoading={isDetailLoading}
            onEdit={openEditForm}
            onRetry={() => void reloadDetail()}
          />
        </section>
      ) : null}

      <ConfirmDialog
        confirmLabel={getConfirmLabel(pendingAction)}
        description={getConfirmDescription(pendingAction)}
        isConfirming={isConfirming}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void handleConfirmAction()}
        open={Boolean(pendingAction)}
        title={getConfirmTitle(pendingAction)}
        variant={pendingAction?.type === "cancel" ? "destructive" : "default"}
      />
    </div>
  );
}

function RecurringTransactionRow({
  isSelected,
  onCancel,
  onEdit,
  onGenerate,
  onPause,
  onResume,
  onSelect,
  recurringTransaction
}: {
  isSelected: boolean;
  onCancel: (recurringTransaction: RecurringTransaction) => void;
  onEdit: (recurringTransaction: RecurringTransaction) => void;
  onGenerate: (recurringTransaction: RecurringTransaction) => void;
  onPause: (recurringTransaction: RecurringTransaction) => void;
  onResume: (recurringTransaction: RecurringTransaction) => void;
  onSelect: (recurringTransaction: RecurringTransaction) => void;
  recurringTransaction: RecurringTransaction;
}) {
  const canGenerate = recurringTransaction.status === "ACTIVE" && Boolean(recurringTransaction.nextRunDate);
  const canPause = recurringTransaction.status === "ACTIVE";
  const canResume = recurringTransaction.status === "PAUSED";
  const canCancel = recurringTransaction.status === "ACTIVE" || recurringTransaction.status === "PAUSED";

  return (
    <article className={`rounded-lg border p-4 transition-colors ${isSelected ? "border-primary bg-secondary/40" : "border-border bg-card hover:border-primary/25"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-foreground">{recurringTransaction.name}</h2>
            <StatusBadge status={recurringTransaction.status} />
            <StatusBadge status={recurringTransaction.type} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {recurringTransaction.category.name} - {recurringTransaction.wallet.name}
          </p>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
            <InfoItem label="Amount" value={<SensitiveValue format="currency" value={recurringTransaction.amount} />} />
            <InfoItem label="Frequency" value={formatFrequency(recurringTransaction)} />
            <InfoItem label="Next run" value={formatMaybeDate(recurringTransaction.nextRunDate)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 lg:justify-end">
          <Button aria-label="View detail" onClick={() => onSelect(recurringTransaction)} size="icon" type="button" variant="ghost">
            <Eye className="h-4 w-4" />
          </Button>
          <Button aria-label="Edit recurring transaction" onClick={() => onEdit(recurringTransaction)} size="icon" type="button" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button aria-label="Generate transaction" disabled={!canGenerate} onClick={() => onGenerate(recurringTransaction)} size="icon" type="button" variant="ghost">
            <Sparkles className="h-4 w-4" />
          </Button>
          {canPause ? (
            <Button aria-label="Pause recurring transaction" onClick={() => onPause(recurringTransaction)} size="icon" type="button" variant="ghost">
              <Pause className="h-4 w-4" />
            </Button>
          ) : null}
          {canResume ? (
            <Button aria-label="Resume recurring transaction" onClick={() => onResume(recurringTransaction)} size="icon" type="button" variant="ghost">
              <Play className="h-4 w-4" />
            </Button>
          ) : null}
          <Button aria-label="Cancel recurring transaction" disabled={!canCancel} onClick={() => onCancel(recurringTransaction)} size="icon" type="button" variant="ghost">
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function RecurringDetailPanel({
  detail,
  errorMessage,
  isLoading,
  onEdit,
  onRetry
}: {
  detail: ReturnType<typeof useRecurringTransactionDetail>["recurringTransaction"];
  errorMessage: string | null;
  isLoading: boolean;
  onEdit: (recurringTransaction: RecurringTransaction) => void;
  onRetry: () => void;
}) {
  if (!detail && !isLoading && !errorMessage) {
    return (
      <SectionCard title="Rule Detail" description="Select a recurring rule to inspect schedule and generation history.">
        <p className="text-sm text-muted-foreground">Recent generated transactions will appear here after a rule is selected.</p>
      </SectionCard>
    );
  }

  if (isLoading) {
    return (
      <SectionCard title="Loading detail" description="Loading recurring transaction detail.">
        <div className="space-y-3">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-20 animate-pulse rounded bg-muted" />
          <div className="h-32 animate-pulse rounded bg-muted" />
        </div>
      </SectionCard>
    );
  }

  if (errorMessage) {
    return (
      <SectionCard title="Could not load detail" description={errorMessage}>
        <Button onClick={onRetry} type="button">
          Retry
        </Button>
      </SectionCard>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <SectionCard
      title={detail.name}
      description={`${transactionTypeLabels[detail.type]} recurring rule created ${formatDate(detail.createdAt)}.`}
      action={
        <Button onClick={() => onEdit(detail)} size="sm" type="button" variant="outline">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <InfoTile label="Amount" value={<SensitiveValue format="currency" value={detail.amount} />} />
          <InfoTile label="Schedule" value={formatFrequency(detail)} />
          <InfoTile label="Next run" value={formatMaybeDate(detail.nextRunDate)} />
          <InfoTile label="Last generated" value={formatMaybeDate(detail.lastRunDate)} />
          <InfoTile label="Generated count" value={`${detail.totalGeneratedCount}`} />
          <InfoTile label="Auto-generate" value={detail.autoGenerate ? "Enabled" : "Disabled"} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent generated transactions</h3>
          <div className="mt-3">
            <GeneratedTransactionList transactions={detail.recentGeneratedTransactions} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function GeneratedTransactionList({ transactions }: { transactions: RecurringGeneratedTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
        No transactions generated from this rule yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border px-3">
      {transactions.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              <SensitiveValue format="currency" value={item.transaction.amount} />
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Scheduled {formatDate(item.scheduledForDate)} - generated {formatDateTime(item.generatedAt)}
            </p>
          </div>
          <StatusBadge status={item.transaction.type} />
        </div>
      ))}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function FilterSelect({
  children,
  label,
  onChange,
  value
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function RecurringSkeleton() {
  return (
    <SectionCard title="Loading recurring transactions" description="Loading recurring rules.">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border p-4">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function formatFrequency(recurringTransaction: Pick<RecurringTransaction, "frequency" | "interval">) {
  const label = recurringFrequencyLabels[recurringTransaction.frequency].toLowerCase();

  return recurringTransaction.interval === 1 ? recurringFrequencyLabels[recurringTransaction.frequency] : `Every ${recurringTransaction.interval} ${label}s`;
}

function formatMaybeDate(value?: string | null) {
  return value ? formatDate(value) : "Not scheduled";
}

function isDueSoon(value?: string | null) {
  if (!value) {
    return false;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  return date >= now && date <= nextWeek;
}

function getConfirmTitle(action: PendingAction) {
  if (action?.type === "generateDue") {
    return "Generate all due transactions?";
  }

  if (action?.type === "generate") {
    return "Generate this transaction?";
  }

  if (action?.type === "pause") {
    return "Pause recurring transaction?";
  }

  if (action?.type === "resume") {
    return "Resume recurring transaction?";
  }

  return "Cancel recurring transaction?";
}

function getConfirmDescription(action: PendingAction) {
  if (action?.type === "generateDue") {
    return "BudgetFlow will create one transaction for each active recurring rule that is due. Duplicate scheduled occurrences are blocked.";
  }

  if (action?.type === "generate") {
    return `BudgetFlow will generate the next scheduled transaction for ${action.recurringTransaction.name}.`;
  }

  if (action?.type === "pause") {
    return `${action.recurringTransaction.name} will stop generating until you resume it.`;
  }

  if (action?.type === "resume") {
    return `${action.recurringTransaction.name} will be active again. Missed dates are not backfilled automatically.`;
  }

  if (action?.type === "cancel") {
    return `${action.recurringTransaction.name} will be cancelled. Generated transaction history will stay intact.`;
  }

  return "";
}

function getConfirmLabel(action: PendingAction) {
  if (action?.type === "generateDue") {
    return "Generate due";
  }

  if (action?.type === "generate") {
    return "Generate";
  }

  if (action?.type === "pause") {
    return "Pause";
  }

  if (action?.type === "resume") {
    return "Resume";
  }

  return "Cancel rule";
}
