"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, WalletCards } from "lucide-react";

import { WalletForm } from "@/components/wallets/wallet-form";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWallets } from "@/hooks/use-wallets";
import { getFriendlyApiError } from "@/lib/api/http";
import { walletTypeLabels } from "@/lib/labels";
import type { WalletFormValues } from "@/lib/validation/wallets";
import { useToast } from "@/providers/toast-provider";
import type { Wallet, WalletType } from "@/types/api";

const walletTone: Record<WalletType, string> = {
  CASH: "bg-secondary text-primary",
  BANK: "bg-blue-50 text-blue-700",
  EWALLET: "bg-emerald-50 text-emerald-700",
  CREDIT_CARD: "bg-amber-50 text-amber-700",
  OTHER: "bg-muted text-muted-foreground"
};

export default function WalletsPage() {
  const { createWallet, deleteWallet, errorMessage, isLoading, reload, updateWallet, wallets } = useWallets();
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalBalance = useMemo(
    () => wallets.reduce((total, wallet) => total + wallet.currentBalance, 0),
    [wallets]
  );

  const openCreateForm = () => {
    setEditingWallet(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingWallet(null);
    setFormError(null);
  };

  const handleSubmit = async (values: WalletFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, values);
        showToast({ title: "Wallet updated", variant: "success" });
      } else {
        await createWallet(values);
        showToast({ title: "Wallet created", variant: "success" });
      }

      closeForm();
    } catch (error) {
      const message = getFriendlyApiError(error, editingWallet ? "updateWallet" : "createWallet");
      setFormError(message);
      showToast({ title: "Wallet was not saved", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (wallet: Wallet) => {
    const confirmed = window.confirm(`Delete ${wallet.name}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setDeletingId(wallet.id);

    try {
      await deleteWallet(wallet.id);
      showToast({ title: "Wallet deleted", variant: "success" });
    } catch (error) {
      showToast({
        title: "Wallet was not deleted",
        description: getFriendlyApiError(error, "deleteWallet"),
        variant: "error"
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallets"
        description="View cash, bank, e-wallet, and credit card balances in one place."
        actions={
          <>
            <Button disabled={isLoading} onClick={() => void reload()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Add Wallet
            </Button>
          </>
        }
      />

      {isFormOpen ? (
        <SectionCard
          title={editingWallet ? "Edit wallet" : "Create wallet"}
          description="Wallet balances are shown in Indonesian Rupiah."
        >
          <div className="space-y-4">
            {formError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            ) : null}
            <WalletForm wallet={editingWallet} isSubmitting={isSubmitting} onCancel={closeForm} onSubmit={handleSubmit} />
          </div>
        </SectionCard>
      ) : null}

      {isLoading ? <WalletSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <SectionCard title="Could not load wallets" description={errorMessage}>
          <Button onClick={() => void reload()} type="button">
            Retry
          </Button>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && wallets.length === 0 ? (
        <SectionCard
          title="No wallets yet"
          description="Add your first wallet so BudgetFlow can show balances in one place."
          action={
            <Button onClick={openCreateForm} type="button">
              <Plus className="h-4 w-4" />
              Add Wallet
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">Cash, bank accounts, e-wallets, credit cards, and other balances can live here.</p>
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && wallets.length > 0 ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total balance</p>
                <SensitiveValue
                  as="p"
                  className="number-tabular text-2xl font-bold text-foreground"
                  format="currency"
                  value={totalBalance}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{wallets.length} wallet{wallets.length === 1 ? "" : "s"} connected</p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {wallets.map((wallet) => (
              <article key={wallet.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${walletTone[wallet.type]}`}>
                      <WalletCards className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-foreground">{wallet.name}</h2>
                      <Badge className="mt-1" variant="outline">
                        {walletTypeLabels[wallet.type]}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button aria-label={`Edit ${wallet.name}`} onClick={() => openEditForm(wallet)} size="icon" type="button" variant="ghost">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={`Delete ${wallet.name}`}
                      disabled={deletingId === wallet.id}
                      onClick={() => void handleDelete(wallet)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      {deletingId === wallet.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
                    </Button>
                  </div>
                </div>
                <div className="mt-5 space-y-1">
                  <p className="text-sm text-muted-foreground">Current balance</p>
                  <SensitiveValue
                    as="p"
                    className="number-tabular text-2xl font-bold text-foreground"
                    format="currency"
                    value={wallet.currentBalance}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Initial balance <SensitiveValue format="currency" value={wallet.initialBalance} />
                </p>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}

function WalletSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-5 h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </section>
  );
}
