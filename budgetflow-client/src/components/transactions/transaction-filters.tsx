"use client";

import { Search } from "lucide-react";

import { ActiveFilterChips, FilterField, FilterPanel, filterSelectClassName, type FilterGroup } from "@/components/shared/filter-panel";
import { Input } from "@/components/ui/input";
import type { TransactionFilters } from "@/lib/api/transactions.api";
import { categoryTypeLabels, transactionPurposeLabels, transactionTypeLabels, walletTypeLabels } from "@/lib/labels";
import { transactionPurposeValues, transactionTypeValues } from "@/lib/validation/transactions";
import type { Category, Wallet } from "@/types/api";

interface TransactionFiltersProps {
  categories: Category[];
  filters: TransactionFilters;
  isCategoriesLoading: boolean;
  isWalletsLoading: boolean;
  onChange: (filters: TransactionFilters) => void;
  onClear: () => void;
  wallets: Wallet[];
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - 4 + index);
const monthOptions = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" }
];

const emptyFilters: TransactionFilters = {
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

export function TransactionFilters({
  categories,
  filters,
  isCategoriesLoading,
  isWalletsLoading,
  onChange,
  onClear,
  wallets
}: TransactionFiltersProps) {
  const categoryOptions = filters.type ? categories.filter((category) => category.type === filters.type) : categories;
  const activeChips = getTransactionFilterChips(filters, categories, wallets);
  const filterGroups: Array<FilterGroup<TransactionFilters>> = [
    {
      id: "type",
      title: "Type",
      summary: filters.type ? transactionTypeLabels[filters.type] : "All income and expenses",
      render: (draft, setDraft) => (
        <FilterField label="Transaction Type">
          <select
            className={filterSelectClassName}
            onChange={(event) => setDraft({ ...draft, type: event.target.value as TransactionFilters["type"], categoryId: "" })}
            value={draft.type ?? ""}
          >
            <option value="">All types</option>
            {transactionTypeValues.map((type) => (
              <option key={type} value={type}>
                {transactionTypeLabels[type]}
              </option>
            ))}
          </select>
        </FilterField>
      )
    },
    {
      id: "purpose",
      title: "Purpose",
      summary: filters.purpose ? transactionPurposeLabels[filters.purpose] : "All purposes",
      render: (draft, setDraft) => (
        <FilterField label="Purpose">
          <select
            className={filterSelectClassName}
            onChange={(event) => setDraft({ ...draft, purpose: event.target.value as TransactionFilters["purpose"] })}
            value={draft.purpose ?? ""}
          >
            <option value="">All purposes</option>
            {transactionPurposeValues.map((purpose) => (
              <option key={purpose} value={purpose}>
                {transactionPurposeLabels[purpose]}
              </option>
            ))}
          </select>
        </FilterField>
      )
    },
    {
      id: "wallet",
      title: "Wallet",
      summary: getWalletName(filters.walletId, wallets) ?? "All wallets",
      render: (draft, setDraft) => (
        <FilterField label="Wallet">
          <select
            className={filterSelectClassName}
            disabled={isWalletsLoading}
            onChange={(event) => setDraft({ ...draft, walletId: event.target.value })}
            value={draft.walletId ?? ""}
          >
            <option value="">{isWalletsLoading ? "Loading wallets..." : "All wallets"}</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name} ({walletTypeLabels[wallet.type]})
              </option>
            ))}
          </select>
        </FilterField>
      )
    },
    {
      id: "category",
      title: "Category",
      summary: getCategoryName(filters.categoryId, categories) ?? "All categories",
      render: (draft, setDraft) => {
        const draftCategoryOptions = draft.type ? categories.filter((category) => category.type === draft.type) : categories;

        return (
          <FilterField label="Category">
            <select
              className={filterSelectClassName}
              disabled={isCategoriesLoading}
              onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
              value={draft.categoryId ?? ""}
            >
              <option value="">{isCategoriesLoading ? "Loading categories..." : "All categories"}</option>
              {draftCategoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({categoryTypeLabels[category.type]})
                </option>
              ))}
            </select>
          </FilterField>
        );
      }
    },
    {
      id: "period",
      title: "Period",
      summary: getPeriodSummary(filters),
      render: (draft, setDraft) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterField label="Month">
            <select
              className={filterSelectClassName}
              onChange={(event) => setDraft({ ...draft, month: event.target.value, year: event.target.value && !draft.year ? `${currentYear}` : draft.year })}
              value={draft.month ?? ""}
            >
              <option value="">Any month</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Year">
            <select className={filterSelectClassName} onChange={(event) => setDraft({ ...draft, year: event.target.value })} value={draft.year ?? ""}>
              <option value="">Any year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      )
    },
    {
      id: "date-range",
      title: "Date Range",
      summary: filters.startDate || filters.endDate ? `${filters.startDate || "Any"} to ${filters.endDate || "Any"}` : "Any date",
      render: (draft, setDraft) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterField label="Start Date">
            <Input onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} type="date" value={draft.startDate ?? ""} />
          </FilterField>
          <FilterField label="End Date">
            <Input onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} type="date" value={draft.endDate ?? ""} />
          </FilterField>
        </div>
      )
    }
  ];

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Search transactions</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9"
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Search note, wallet, or category"
            value={filters.search ?? ""}
          />
        </label>
        <FilterPanel
          activeCount={activeChips.length}
          draft={filters}
          groups={filterGroups}
          onApply={onChange}
          onReset={() => ({ ...emptyFilters, search: filters.search ?? "" })}
        />
      </div>

      <ActiveFilterChips chips={activeChips} onClear={onClear} />
      {categoryOptions.length === 0 && filters.type ? <p className="text-sm text-muted-foreground">No categories are available for the selected type.</p> : null}
    </section>
  );
}

function getTransactionFilterChips(filters: TransactionFilters, categories: Category[], wallets: Wallet[]) {
  const chips: string[] = [];

  if (filters.search) chips.push(`Search: ${filters.search}`);
  if (filters.type) chips.push(`Type: ${transactionTypeLabels[filters.type]}`);
  if (filters.purpose) chips.push(`Purpose: ${transactionPurposeLabels[filters.purpose]}`);
  if (filters.walletId) chips.push(`Wallet: ${getWalletName(filters.walletId, wallets) ?? "Selected"}`);
  if (filters.categoryId) chips.push(`Category: ${getCategoryName(filters.categoryId, categories) ?? "Selected"}`);
  if (filters.month) chips.push(`Month: ${monthOptions.find((month) => month.value === String(filters.month))?.label ?? filters.month}`);
  if (filters.year) chips.push(`Year: ${filters.year}`);
  if (filters.startDate) chips.push(`From: ${filters.startDate}`);
  if (filters.endDate) chips.push(`To: ${filters.endDate}`);

  return chips;
}

function getWalletName(walletId: string | undefined, wallets: Wallet[]) {
  return wallets.find((wallet) => wallet.id === walletId)?.name;
}

function getCategoryName(categoryId: string | undefined, categories: Category[]) {
  return categories.find((category) => category.id === categoryId)?.name;
}

function getPeriodSummary(filters: TransactionFilters) {
  if (!filters.month && !filters.year) {
    return "Any month or year";
  }

  const month = monthOptions.find((option) => option.value === String(filters.month))?.label;

  return [month, filters.year].filter(Boolean).join(" ");
}
