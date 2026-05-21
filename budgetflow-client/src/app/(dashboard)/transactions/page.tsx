"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Scale,
  Trash2
} from "lucide-react";

import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { PaginationControls, useClientPagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatTile } from "@/components/shared/stat-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { useWallets } from "@/hooks/use-wallets";
import type { TransactionFilters as TransactionFilterValues } from "@/lib/api/transactions.api";
import { getFriendlyApiError } from "@/lib/api/http";
import { transactionPurposeLabels } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TransactionFormValues } from "@/lib/validation/transactions";
import { useToast } from "@/providers/toast-provider";
import type { Category, Transaction, Wallet } from "@/types/api";

const emptyFilters: TransactionFilterValues = {
  type: "",
  purpose: "",
  walletId: "",
  categoryId: "",
  month: "",
  year: "",
  startDate: "",
  endDate: "",
  search: ""
};

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilterValues>(emptyFilters);
  const { categories, errorMessage: categoryError, isLoading: isCategoriesLoading } = useCategories();
  const { errorMessage: walletError, isLoading: isWalletsLoading, reload: reloadWallets, wallets } = useWallets();
  const {
    createTransaction,
    deleteTransaction,
    errorMessage,
    isLoading,
    reload,
    transactions,
    updateTransaction
  } = useTransactions(filters);
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => Boolean(value)),
    [filters]
  );
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const transactionPagination = useClientPagination(transactions, [filterKey]);

  const summary = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.type === "INCOME")
      .reduce((total, transaction) => total + transaction.amount, 0);
    const expense = transactions
      .filter((transaction) => transaction.type === "EXPENSE")
      .reduce((total, transaction) => total + transaction.amount, 0);

    return {
      income,
      expense,
      net: income - expense,
      count: transactions.length
    };
  }, [transactions]);

  const walletById = useMemo(
    () => new Map(wallets.map((wallet) => [wallet.id, wallet])),
    [wallets]
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const openCreateForm = () => {
    setEditingTransaction(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
    setFormError(null);
  };

  const normalizeTransactionInput = (values: TransactionFormValues) => ({
    walletId: values.walletId,
    categoryId: values.categoryId,
    type: values.type,
    purpose: values.purpose,
    amount: values.amount,
    transactionDate: values.transactionDate,
    note: values.note?.trim() || null
  });

  const handleSubmit = async (values: TransactionFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, normalizeTransactionInput(values));
        showToast({ title: "Transaction updated", variant: "success" });
      } else {
        await createTransaction(normalizeTransactionInput(values));
        showToast({ title: "Transaction created", variant: "success" });
      }

      await reloadWallets();
      closeForm();
    } catch (error) {
      const message = getFriendlyApiError(error, editingTransaction ? "updateTransaction" : "createTransaction");
      setFormError(message);
      showToast({ title: "Transaction was not saved", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    const transactionTitle = getTransactionTitle(transaction, categoryById, walletById);
    const confirmed = window.confirm(`Delete ${transactionTitle} for ${getSignedAmount(transaction)}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setDeletingId(transaction.id);

    try {
      await deleteTransaction(transaction.id);
      await reloadWallets();
      showToast({ title: "Transaction deleted", variant: "success" });
    } catch (error) {
      showToast({
        title: "Transaction was not deleted",
        description: getFriendlyApiError(error, "deleteTransaction"),
        variant: "error"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Review, filter, and manage income and expenses across your accounts."
        actions={
          <>
            <Button disabled={isLoading} onClick={() => void reload()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Income" value={formatCurrency(summary.income)} helper="Filtered transaction income" icon={ArrowUpCircle} tone="success" />
        <StatTile label="Expense" value={formatCurrency(summary.expense)} helper="Filtered transaction expense" icon={ArrowDownCircle} tone="danger" />
        <StatTile label="Net flow" value={formatCurrency(summary.net)} helper="Income minus expense" icon={Scale} tone={summary.net < 0 ? "warning" : "primary"} />
        <StatTile label="Records" value={`${summary.count}`} helper="Transactions in current view" icon={ReceiptText} tone="blue" />
      </section>

      {isFormOpen ? (
        <SectionCard
          title={editingTransaction ? "Edit transaction" : "Create transaction"}
          description="Wallet balance changes are calculated automatically from the transaction details."
        >
          <div className="space-y-4">
            {formError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            ) : null}
            <TransactionForm
              categories={categories}
              categoryError={categoryError}
              isCategoriesLoading={isCategoriesLoading}
              isSubmitting={isSubmitting}
              isWalletsLoading={isWalletsLoading}
              onCancel={closeForm}
              onSubmit={handleSubmit}
              transaction={editingTransaction}
              walletError={walletError}
              wallets={wallets}
            />
          </div>
        </SectionCard>
      ) : null}

      <TransactionFilters
        categories={categories}
        filters={filters}
        isCategoriesLoading={isCategoriesLoading}
        isWalletsLoading={isWalletsLoading}
        onChange={setFilters}
        onClear={clearFilters}
        wallets={wallets}
      />

      {isLoading ? <TransactionsSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <SectionCard title="Could not load transactions" description={errorMessage}>
          <Button onClick={() => void reload()} type="button">
            Retry
          </Button>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && transactions.length === 0 ? (
        <SectionCard
          title={hasActiveFilters ? "No transactions match your filters" : "No transactions yet"}
          description={
            hasActiveFilters
              ? "Try clearing filters or widening the date range."
              : "Add your first income or expense record to begin tracking wallet movement."
          }
          action={
            hasActiveFilters ? (
              <Button onClick={clearFilters} type="button" variant="outline">
                Clear Filters
              </Button>
            ) : (
              <Button onClick={openCreateForm} type="button">
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
            )
          }
        >
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "No records match the current search and filters."
              : "Transactions will show date, type, category, wallet, purpose, note, and amount."}
          </p>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && transactions.length > 0 ? (
        <SectionCard title="Transaction List" description={`${transactions.length} transaction${transactions.length === 1 ? "" : "s"} in the current view.`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Wallet</th>
                  <th className="px-3 py-3 font-semibold">Purpose</th>
                  <th className="px-3 py-3 font-semibold">Note</th>
                  <th className="px-3 py-3 text-right font-semibold">Amount</th>
                  <th className="px-3 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactionPagination.paginatedItems.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    category={getCategory(transaction, categoryById)}
                    deletingId={deletingId}
                    onDelete={handleDelete}
                    onEdit={openEditForm}
                    transaction={transaction}
                    wallet={getWallet(transaction, walletById)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            className="mt-4"
            onPageChange={transactionPagination.setPage}
            onPageSizeChange={transactionPagination.setPageSize}
            page={transactionPagination.page}
            pageSize={transactionPagination.pageSize}
            totalItems={transactionPagination.totalItems}
            totalPages={transactionPagination.totalPages}
          />
        </SectionCard>
      ) : null}
    </div>
  );
}

interface TransactionRowProps {
  category?: Category | Transaction["category"];
  deletingId: string | null;
  onDelete: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  transaction: Transaction;
  wallet?: Wallet | Transaction["wallet"];
}

function TransactionRow({ category, deletingId, onDelete, onEdit, transaction, wallet }: TransactionRowProps) {
  const isIncome = transaction.type === "INCOME";
  const categoryName = category?.name ?? "Unknown category";
  const walletName = wallet?.name ?? "Unknown wallet";

  return (
    <tr className="transition-colors hover:bg-muted/50">
      <td className="px-3 py-4 text-muted-foreground">{formatDate(transaction.transactionDate)}</td>
      <td className="px-3 py-4">
        <StatusBadge status={transaction.type} />
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category?.color ?? "#007F68" }} />
          <span className="font-medium text-foreground">{categoryName}</span>
        </div>
      </td>
      <td className="px-3 py-4 text-muted-foreground">{walletName}</td>
      <td className="px-3 py-4">
        <Badge variant="outline">{transactionPurposeLabels[transaction.purpose]}</Badge>
      </td>
      <td className="max-w-[220px] px-3 py-4">
        <span className="block truncate text-muted-foreground">{transaction.note || "No note"}</span>
      </td>
      <td className={`number-tabular px-3 py-4 text-right font-semibold ${isIncome ? "text-emerald-700" : "text-red-600"}`}>
        {getSignedAmount(transaction)}
      </td>
      <td className="px-3 py-4">
        <div className="flex justify-end gap-1">
          <Button aria-label="Edit transaction" onClick={() => onEdit(transaction)} size="icon" type="button" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Delete transaction"
            disabled={deletingId === transaction.id}
            onClick={() => onDelete(transaction)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {deletingId === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function TransactionsSkeleton() {
  return (
    <SectionCard title="Loading transactions" description="Loading transaction data.">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[120px_90px_1fr_1fr_120px]">
            <div className="h-4 animate-pulse rounded bg-muted" />
            <div className="h-4 animate-pulse rounded bg-muted" />
            <div className="h-4 animate-pulse rounded bg-muted" />
            <div className="h-4 animate-pulse rounded bg-muted" />
            <div className="h-4 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function getWallet(transaction: Transaction, walletById: Map<string, Wallet>) {
  return transaction.wallet ?? walletById.get(transaction.walletId);
}

function getCategory(transaction: Transaction, categoryById: Map<string, Category>) {
  return transaction.category ?? categoryById.get(transaction.categoryId);
}

function getTransactionTitle(
  transaction: Transaction,
  categoryById: Map<string, Category>,
  walletById: Map<string, Wallet>
) {
  const category = getCategory(transaction, categoryById);
  const wallet = getWallet(transaction, walletById);

  return `${category?.name ?? "transaction"} from ${wallet?.name ?? "wallet"} on ${formatDate(transaction.transactionDate)}`;
}

function getSignedAmount(transaction: Transaction) {
  const prefix = transaction.type === "INCOME" ? "+" : "-";

  return `${prefix}${formatCurrency(transaction.amount)}`;
}
