"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { Button } from "@/components/ui/button";
import { transactionsApi, type TransactionInput } from "@/lib/api/transactions.api";
import { getFriendlyApiError } from "@/lib/api/http";
import { dispatchTransactionsChanged, subscribeToCreateTransactionRequested } from "@/lib/events";
import type { TransactionFormValues } from "@/lib/validation/transactions";
import { useCategories } from "@/hooks/use-categories";
import { useWallets } from "@/hooks/use-wallets";
import { useToast } from "@/providers/toast-provider";

const quickAddRoutes = ["/dashboard", "/transactions", "/budgets", "/calendar"];

export function QuickAddTransaction() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isAllowedRoute = quickAddRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => subscribeToCreateTransactionRequested(() => setIsOpen(true)), []);

  return (
    <>
      {isAllowedRoute ? (
        <Button
          aria-label="Quick add transaction"
          className="fixed right-4 z-50 h-14 w-14 rounded-full p-0 shadow-xl lg:hidden"
          onClick={() => setIsOpen(true)}
          style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
          type="button"
        >
          <Plus className="h-6 w-6" />
        </Button>
      ) : null}
      {isOpen ? <QuickAddTransactionSheet onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}

function QuickAddTransactionSheet({ onClose }: { onClose: () => void }) {
  const { categories, errorMessage: categoryError, isLoading: isCategoriesLoading } = useCategories();
  const { errorMessage: walletError, isLoading: isWalletsLoading, reload: reloadWallets, wallets } = useWallets();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useMemo(() => "quick-add-transaction-title", []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (values: TransactionFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      await transactionsApi.create(normalizeTransactionInput(values));
      await reloadWallets();
      dispatchTransactionsChanged();
      showToast({ title: "Transaction created", variant: "success" });
      onClose();
    } catch (error) {
      const message = getFriendlyApiError(error, "createTransaction");
      setFormError(message);
      showToast({ title: "Transaction was not saved", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button aria-label="Close quick add transaction" className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} type="button" />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-border bg-card shadow-2xl sm:left-1/2 sm:top-1/2 sm:w-[min(720px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card/95 px-4 py-4 backdrop-blur">
          <div>
            <h2 className="text-base font-semibold text-foreground" id={titleId}>
              Quick add transaction
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Create an income or expense without leaving this page.</p>
          </div>
          <Button aria-label="Close quick add transaction" disabled={isSubmitting} onClick={onClose} size="icon" type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 px-4 py-5">
          {formError ? (
            <div className="rounded-lg border border-red-200 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:text-red-200">
              {formError}
            </div>
          ) : null}
          {isWalletsLoading || isCategoriesLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading selectors...
            </div>
          ) : null}
          <TransactionForm
            categories={categories}
            categoryError={categoryError}
            isCategoriesLoading={isCategoriesLoading}
            isSubmitting={isSubmitting}
            isWalletsLoading={isWalletsLoading}
            onCancel={onClose}
            onSubmit={handleSubmit}
            walletError={walletError}
            wallets={wallets}
          />
        </div>
      </div>
    </div>
  );
}

function normalizeTransactionInput(values: TransactionFormValues): TransactionInput {
  return {
    amount: values.amount,
    categoryId: values.categoryId,
    note: values.note?.trim() || null,
    purpose: values.purpose,
    transactionDate: values.transactionDate,
    type: values.type,
    walletId: values.walletId
  };
}
