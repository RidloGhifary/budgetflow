"use client";

import { usePathname } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { dispatchCreateTransactionRequested } from "@/lib/events";
import { useAuth } from "@/providers/auth-provider";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transactions",
  "/recurring": "Recurring Transactions",
  "/budgets": "Budgets",
  "/calendar": "Calendar",
  "/debts": "Debts",
  "/goals": "Saving Goals",
  "/notifications": "Notifications",
  "/reports": "Reports",
  "/wallets": "Wallets",
  "/categories": "Categories",
  "/activity": "Activity Log",
  "/settings": "Settings"
};

export function TopHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const title = pageTitles[pathname] ?? "BudgetFlow";
  const initials =
    user?.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0]?.toUpperCase())
      .join("") || "BF";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4 lg:px-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Overview</p>
          <h2 className="mt-1 text-lg font-bold text-foreground sm:text-xl">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" type="button">
            <CalendarDays className="h-4 w-4" />
            May 2026
          </Button>
          <Button aria-label="Create transaction" className="px-3 sm:px-4" onClick={dispatchCreateTransactionRequested} type="button">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Transaction</span>
          </Button>
          <ThemeToggle />
          <NotificationBell />
          <div className="flex h-10 items-center gap-3 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
              {initials}
            </span>
            <span className="hidden max-w-40 truncate sm:inline">{user?.name || "BudgetFlow"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
