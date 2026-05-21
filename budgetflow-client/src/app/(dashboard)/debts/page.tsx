"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  HandCoins,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2
} from "lucide-react";

import { DebtFilters } from "@/components/debts/debt-filters";
import { DebtForm } from "@/components/debts/debt-form";
import { DebtPaymentForm } from "@/components/debts/debt-payment-form";
import { PaginationControls, useClientPagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressIndicator } from "@/components/shared/progress-indicator";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import { useDebtDetail, useDebtSummary, useDebts } from "@/hooks/use-debts";
import { useWallets } from "@/hooks/use-wallets";
import { getFriendlyApiError } from "@/lib/api/http";
import type { DebtFilters as DebtFilterValues, DebtInput, DebtPaymentInput } from "@/lib/api/debts.api";
import { debtTypeLabels } from "@/lib/labels";
import { formatCurrency, formatDate, formatPercent, getProgress } from "@/lib/format";
import type { DebtFormValues, DebtPaymentFormValues } from "@/lib/validation/debts";
import { useToast } from "@/providers/toast-provider";
import type { Debt, DebtPayment } from "@/types/api";

const emptyFilters: DebtFilterValues = {
  type: "",
  status: "",
  search: "",
  dueBefore: "",
  dueAfter: ""
};

export default function DebtsPage() {
  const [filters, setFilters] = useState<DebtFilterValues>(emptyFilters);
  const {
    createDebt,
    debts,
    deleteDebt,
    errorMessage: debtError,
    isLoading: isDebtsLoading,
    recordPayment,
    reload: reloadDebts,
    updateDebt
  } = useDebts(filters);
  const {
    errorMessage: summaryError,
    isLoading: isSummaryLoading,
    reload: reloadSummary,
    summary
  } = useDebtSummary();
  const { categories, errorMessage: categoryError, isLoading: isCategoriesLoading } = useCategories();
  const { errorMessage: walletError, isLoading: isWalletsLoading, reload: reloadWallets, wallets } = useWallets();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const {
    debt: detailedDebt,
    errorMessage: detailError,
    isLoading: isDetailLoading,
    reload: reloadDetail
  } = useDebtDetail(expandedDebtId);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isLoading = isDebtsLoading || isSummaryLoading;
  const errorMessage = debtError || summaryError;
  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => Boolean(value)),
    [filters]
  );
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const debtPagination = useClientPagination(debts, [filterKey]);

  const openCreateForm = () => {
    setEditingDebt(null);
    setPaymentDebt(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (debt: Debt) => {
    setEditingDebt(debt);
    setPaymentDebt(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingDebt(null);
    setFormError(null);
  };

  const openPaymentForm = (debt: Debt) => {
    setPaymentDebt(debt);
    setIsFormOpen(false);
    setPaymentError(null);
  };

  const closePaymentForm = () => {
    setPaymentDebt(null);
    setPaymentError(null);
  };

  const reloadPage = async () => {
    await Promise.all([reloadDebts(), reloadSummary()]);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
  };

  const normalizeDebtInput = (values: DebtFormValues): DebtInput => ({
    type: values.type,
    title: values.title.trim(),
    personName: values.personName.trim(),
    totalAmount: values.totalAmount,
    dueDate: values.dueDate || null,
    note: values.note?.trim() || null
  });

  const normalizePaymentInput = (values: DebtPaymentFormValues): DebtPaymentInput => ({
    amount: values.amount,
    walletId: values.walletId,
    categoryId: values.categoryId,
    paymentDate: values.paymentDate,
    note: values.note?.trim() || null
  });

  const handleDebtSubmit = async (values: DebtFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingDebt) {
        await updateDebt(editingDebt.id, normalizeDebtInput(values));
        showToast({ title: "Debt updated", variant: "success" });

        if (expandedDebtId === editingDebt.id) {
          await reloadDetail();
        }
      } else {
        await createDebt(normalizeDebtInput(values));
        showToast({ title: "Debt created", variant: "success" });
      }

      await reloadSummary();
      closeForm();
    } catch (error) {
      const message = getFriendlyApiError(error, editingDebt ? "updateDebt" : "createDebt");
      setFormError(message);
      showToast({ title: "Debt was not saved", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (values: DebtPaymentFormValues) => {
    if (!paymentDebt) {
      return;
    }

    setIsPaymentSubmitting(true);
    setPaymentError(null);

    try {
      await recordPayment(paymentDebt.id, normalizePaymentInput(values));
      await Promise.all([
        reloadSummary(),
        reloadWallets(),
        expandedDebtId === paymentDebt.id ? reloadDetail() : Promise.resolve()
      ]);
      showToast({
        title: paymentDebt.type === "I_OWE" ? "Debt payment recorded" : "Debt collection recorded",
        variant: "success"
      });
      closePaymentForm();
    } catch (error) {
      const message = getFriendlyApiError(error, "recordDebtPayment");
      setPaymentError(message);
      showToast({
        title: paymentDebt.type === "I_OWE" ? "Payment was not recorded" : "Collection was not recorded",
        description: message,
        variant: "error"
      });
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  const handleDelete = async (debt: Debt) => {
    const confirmed = window.confirm(`Delete ${debt.title} with ${debt.personName}? Debts with payment history may need to be reviewed first.`);

    if (!confirmed) {
      return;
    }

    setDeletingId(debt.id);

    try {
      await deleteDebt(debt.id);
      await reloadSummary();

      if (expandedDebtId === debt.id) {
        setExpandedDebtId(null);
      }

      showToast({ title: "Debt deleted", variant: "success" });
    } catch (error) {
      showToast({
        title: "Debt was not deleted",
        description: getFriendlyApiError(error, "deleteDebt"),
        variant: "error"
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debts"
        description="Track what you owe, what is owed to you, and linked payment history."
        actions={
          <>
            <Button disabled={isLoading} onClick={() => void reloadPage()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Add Debt
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total I Owe"
          value={formatCurrency(summary?.totalIOweRemainingAmount ?? 0)}
          helper={`${summary?.unpaidDebtCount ?? 0} unpaid, ${summary?.partialDebtCount ?? 0} partial`}
          icon={CreditCard}
          tone="danger"
        />
        <StatTile
          label="Total Owed To Me"
          value={formatCurrency(summary?.totalOwedToMeRemainingAmount ?? 0)}
          helper={`${summary?.paidDebtCount ?? 0} paid debts recorded`}
          icon={HandCoins}
          tone="success"
        />
        <StatTile
          label="Due Soon"
          value={`${summary?.dueSoonCount ?? 0}`}
          helper="Due within the next 7 days"
          icon={CalendarClock}
          tone={(summary?.dueSoonCount ?? 0) > 0 ? "warning" : "blue"}
        />
        <StatTile
          label="Overdue"
          value={`${summary?.overdueCount ?? 0}`}
          helper="Unpaid or partial debts past due"
          icon={AlertTriangle}
          tone={(summary?.overdueCount ?? 0) > 0 ? "danger" : "primary"}
        />
      </section>

      {isFormOpen ? (
        <SectionCard
          title={editingDebt ? "Edit debt" : "Create debt"}
          description="Paid amount, remaining amount, and status are calculated from payment activity."
        >
          <div className="space-y-4">
            {formError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            ) : null}
            <DebtForm debt={editingDebt} isSubmitting={isSubmitting} onCancel={closeForm} onSubmit={handleDebtSubmit} />
          </div>
        </SectionCard>
      ) : null}

      {paymentDebt ? (
        <SectionCard
          title={paymentDebt.type === "I_OWE" ? "Record Debt Payment" : "Record Debt Collection"}
          description={`${formatCurrency(paymentDebt.remainingAmount)} remaining for ${paymentDebt.title}.`}
        >
          <div className="space-y-4">
            {paymentError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{paymentError}</div>
            ) : null}
            <DebtPaymentForm
              categories={categories}
              categoryError={categoryError}
              debt={paymentDebt}
              isCategoriesLoading={isCategoriesLoading}
              isSubmitting={isPaymentSubmitting}
              isWalletsLoading={isWalletsLoading}
              onCancel={closePaymentForm}
              onSubmit={handlePaymentSubmit}
              walletError={walletError}
              wallets={wallets}
            />
          </div>
        </SectionCard>
      ) : null}

      <DebtFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        isLoading={isDebtsLoading}
        onChange={setFilters}
        onClear={clearFilters}
      />

      {isLoading ? <DebtsSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <SectionCard title="Could not load debts" description={errorMessage}>
          <Button onClick={() => void reloadPage()} type="button">
            Retry
          </Button>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && debts.length === 0 ? (
        <SectionCard
          title={hasActiveFilters ? "No debts match your filters" : "No debts yet"}
          description={
            hasActiveFilters
              ? "Try clearing filters or widening the due-date range."
              : "Create your first debt to track payments and collections through linked transactions."
          }
          action={
            hasActiveFilters ? (
              <Button onClick={clearFilters} type="button" variant="outline">
                Clear Filters
              </Button>
            ) : (
              <Button onClick={openCreateForm} type="button">
                <Plus className="h-4 w-4" />
                Add Debt
              </Button>
            )
          }
        >
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters ? "No records match the current search and filters." : "Debt records will show progress, status, due dates, and payment history."}
          </p>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && debts.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {debtPagination.paginatedItems.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              deletingId={deletingId}
              detail={expandedDebtId === debt.id ? detailedDebt : null}
              detailError={expandedDebtId === debt.id ? detailError : null}
              isDetailLoading={expandedDebtId === debt.id && isDetailLoading}
              isExpanded={expandedDebtId === debt.id}
              onDelete={handleDelete}
              onEdit={openEditForm}
              onPayment={openPaymentForm}
              onReloadDetail={reloadDetail}
              onToggleDetail={(nextDebt) => setExpandedDebtId(expandedDebtId === nextDebt.id ? null : nextDebt.id)}
            />
          ))}
          <div className="xl:col-span-2">
            <PaginationControls
              onPageChange={debtPagination.setPage}
              onPageSizeChange={debtPagination.setPageSize}
              page={debtPagination.page}
              pageSize={debtPagination.pageSize}
              totalItems={debtPagination.totalItems}
              totalPages={debtPagination.totalPages}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface DebtCardProps {
  debt: Debt;
  deletingId: string | null;
  detail: { payments: DebtPayment[] } | null;
  detailError: string | null;
  isDetailLoading: boolean;
  isExpanded: boolean;
  onDelete: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onPayment: (debt: Debt) => void;
  onReloadDetail: () => Promise<void>;
  onToggleDetail: (debt: Debt) => void;
}

function DebtCard({
  debt,
  deletingId,
  detail,
  detailError,
  isDetailLoading,
  isExpanded,
  onDelete,
  onEdit,
  onPayment,
  onReloadDetail,
  onToggleDetail
}: DebtCardProps) {
  const progress = getProgress(debt.paidAmount, debt.totalAmount);
  const isPaid = debt.status === "PAID";
  const overdue = isDebtOverdue(debt);
  const tone = isPaid ? "success" : overdue ? "danger" : debt.status === "PARTIAL" ? "warning" : "primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-foreground">{debt.title}</h3>
            <StatusBadge status={debt.status} />
            {overdue ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Overdue</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {debtTypeLabels[debt.type]} - {debt.personName} - {formatDueDate(debt.dueDate)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label={debt.type === "I_OWE" ? "Record payment" : "Record collection"}
            disabled={isPaid}
            onClick={() => onPayment(debt)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {debt.type === "I_OWE" ? <CreditCard className="h-4 w-4" /> : <HandCoins className="h-4 w-4" />}
          </Button>
          <Button aria-label="Edit debt" onClick={() => onEdit(debt)} size="icon" type="button" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Delete debt"
            disabled={deletingId === debt.id}
            onClick={() => onDelete(debt)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {deletingId === debt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <DebtAmount label="Total" value={formatCurrency(debt.totalAmount)} />
        <DebtAmount label="Paid" value={formatCurrency(debt.paidAmount)} />
        <DebtAmount label="Remaining" value={formatCurrency(debt.remainingAmount)} tone={debt.remainingAmount > 0 ? "default" : "success"} />
      </div>

      <div className="mt-5">
        <ProgressIndicator value={progress} tone={tone} label={`${formatPercent(progress)} paid toward ${formatCurrency(debt.totalAmount)}`} />
      </div>

      {debt.note ? <p className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{debt.note}</p> : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{debt.paymentCount ?? 0} payment{(debt.paymentCount ?? 0) === 1 ? "" : "s"} recorded</p>
        <Button onClick={() => onToggleDetail(debt)} type="button" variant="outline">
          <History className="h-4 w-4" />
          {isExpanded ? "Hide history" : "View history"}
        </Button>
      </div>

      {isExpanded ? (
        <PaymentHistory
          errorMessage={detailError}
          isLoading={isDetailLoading}
          onRetry={onReloadDetail}
          payments={detail?.payments ?? []}
        />
      ) : null}
    </div>
  );
}

function DebtAmount({ label, tone = "default", value }: { label: string; tone?: "default" | "success"; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`number-tabular mt-1 font-semibold ${tone === "success" ? "text-emerald-700" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function PaymentHistory({
  errorMessage,
  isLoading,
  onRetry,
  payments
}: {
  errorMessage: string | null;
  isLoading: boolean;
  onRetry: () => Promise<void>;
  payments: DebtPayment[];
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

  if (payments.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
        No payments have been recorded yet.
      </div>
    );
  }

  return (
    <div className="mt-4 divide-y divide-border rounded-lg border border-border px-3">
      {payments.map((payment) => (
        <div key={payment.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{formatCurrency(payment.amount)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatDate(payment.paymentDate)} - {payment.transaction.wallet.name} - {payment.transaction.category.name}
            </p>
          </div>
          <StatusBadge status={payment.transaction.type} />
        </div>
      ))}
    </div>
  );
}

function DebtsSkeleton() {
  return (
    <SectionCard title="Loading debts" description="Loading debt records.">
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

function formatDueDate(value?: string | null) {
  return value ? `due ${formatDate(value)}` : "no due date";
}

function isDebtOverdue(debt: Debt) {
  if (!debt.dueDate || debt.status === "PAID") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(debt.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}
