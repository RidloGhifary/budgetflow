"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, LogOut, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getFriendlyApiError } from "@/lib/api/http";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transactions",
  "/budgets": "Budgets",
  "/debts": "Debts",
  "/goals": "Saving Goals",
  "/reports": "Reports",
  "/wallets": "Wallets",
  "/categories": "Categories",
  "/settings": "Settings"
};

export function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { showToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const title = pageTitles[pathname] ?? "BudgetFlow";
  const initials =
    user?.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0]?.toUpperCase())
      .join("") || "BF";

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      showToast({ title: "Logged out", variant: "success" });
      router.replace("/login");
    } catch (error) {
      showToast({
        title: "Logged out locally",
        description: getFriendlyApiError(error, "request"),
        variant: "error"
      });
      router.replace("/login");
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Overview</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" type="button">
            <CalendarDays className="h-4 w-4" />
            May 2026
          </Button>
          <Button onClick={() => router.push("/transactions")} type="button">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
          <div className="flex h-10 items-center gap-3 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
              {initials}
            </span>
            <span className="hidden max-w-40 truncate sm:inline">{user?.name || "BudgetFlow"}</span>
          </div>
          <Button disabled={isLoggingOut} onClick={handleLogout} type="button" variant="outline">
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>
    </header>
  );
}
