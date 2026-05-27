"use client";

import type { ReactNode } from "react";
import { CalendarClock, Clock3, ReceiptText, Repeat2 } from "lucide-react";

import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { PaginationControls } from "@/components/shared/pagination";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLongDateLabel } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { recurringFrequencyLabels, transactionPurposeLabels, transactionTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CalendarDayDetail, TransactionType } from "@/types/api";

interface CalendarDayDetailPanelProps {
  day: CalendarDayDetail | null;
  errorMessage: string | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
  selectedDate: string;
}

export function CalendarDayDetailPanel({
  day,
  errorMessage,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onRetry,
  selectedDate
}: CalendarDayDetailPanelProps) {
  return (
    <SectionCard
      className="xl:sticky xl:top-28"
      title="Day Details"
      description={getLongDateLabel(selectedDate)}
    >
      {isLoading ? <DayDetailSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <p>{errorMessage}</p>
          <Button className="mt-3" onClick={onRetry} type="button" variant="outline">
            Retry
          </Button>
        </div>
      ) : null}

      {!isLoading && !errorMessage && day ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile label="Income" tone="success" value={<SensitiveValue format="currency" value={day.summary.incomeTotal} />} />
            <SummaryTile label="Expense" tone="danger" value={<SensitiveValue format="currency" value={day.summary.expenseTotal} />} />
            <SummaryTile
              label="Net"
              tone={day.summary.netTotal < 0 ? "danger" : "default"}
              value={<SensitiveValue format="currency" value={day.summary.netTotal} />}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-3">
              <span>{day.summary.transactionCount} transaction{day.summary.transactionCount === 1 ? "" : "s"}</span>
              <span>{day.summary.incomeCount} income</span>
              <span>{day.summary.expenseCount} expense</span>
              <span>{day.summary.recurringUpcomingCount} scheduled recurring</span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Transactions</h3>
            </div>
            {day.transactions.length > 0 ? (
              <div className="space-y-3">
                {day.transactions.map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
                <PaginationControls
                  className="pt-3"
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                  page={day.pagination.page}
                  pageSize={day.pagination.pageSize}
                  totalItems={day.pagination.totalItems}
                  totalPages={day.pagination.totalPages}
                />
              </div>
            ) : (
              <EmptyDetailState text="No transactions on this date." />
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Upcoming Recurring</h3>
            </div>
            {day.upcomingRecurringTransactions.length > 0 ? (
              <div className="space-y-3">
                {day.upcomingRecurringTransactions.map((recurring) => (
                  <RecurringPreviewItem key={recurring.id} recurring={recurring} />
                ))}
              </div>
            ) : (
              <EmptyDetailState text="No scheduled recurring items on this date." />
            )}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

function SummaryTile({ label, tone, value }: { label: string; tone: "danger" | "default" | "success"; value: ReactNode }) {
  return (
    <div className={cn("rounded-md border p-3", tone === "success" && "border-emerald-100 bg-emerald-50", tone === "danger" && "border-red-100 bg-red-50", tone === "default" && "border-border bg-card")}>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="mt-1 text-base font-bold text-foreground">{value}</div>
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: CalendarDayDetail["transactions"][number] }) {
  return (
    <article className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SensitiveText
              className="font-semibold text-foreground"
              text={transaction.note || transaction.category?.name || "Transaction"}
            />
            <TypeBadge type={transaction.type} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {transaction.category?.name ?? "Uncategorized"} from {transaction.wallet?.name ?? "Wallet"}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDate(transaction.transactionDate)} - {transactionPurposeLabels[transaction.purpose]}
          </p>
        </div>
        <div className={cn("text-right font-bold", transaction.type === "EXPENSE" ? "text-red-700" : "text-emerald-700")}>
          <SensitiveValue format="currency" value={transaction.amount} />
        </div>
      </div>
    </article>
  );
}

function RecurringPreviewItem({ recurring }: { recurring: CalendarDayDetail["upcomingRecurringTransactions"][number] }) {
  return (
    <article className="rounded-lg border border-amber-100 bg-amber-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Repeat2 className="h-4 w-4 text-amber-700" />
            <SensitiveText className="font-semibold text-foreground" text={recurring.name} />
            <Badge variant="warning">Scheduled</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {recurring.category.name} from {recurring.wallet.name}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {recurringFrequencyLabels[recurring.frequency]}
            {recurring.interval > 1 ? `, every ${recurring.interval}` : ""} - {formatDate(recurring.scheduledDate)}
          </p>
        </div>
        <div className={cn("text-right font-bold", recurring.type === "EXPENSE" ? "text-red-700" : "text-emerald-700")}>
          <SensitiveValue format="currency" value={recurring.amount} />
        </div>
      </div>
    </article>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  return <Badge variant={type === "INCOME" ? "success" : "danger"}>{transactionTypeLabels[type]}</Badge>;
}

function EmptyDetailState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function DayDetailSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="rounded-lg border border-border p-3" key={index}>
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted" />
          <div className="mt-3 h-5 w-24 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
