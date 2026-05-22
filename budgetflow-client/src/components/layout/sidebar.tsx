"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  FolderKanban,
  Goal,
  Home,
  LayoutGrid,
  PieChart,
  ReceiptText,
  Settings,
  Tags,
  WalletCards
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/debts", label: "Debts", icon: CreditCard },
  { href: "/goals", label: "Saving Goals", icon: Goal },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/wallets", label: "Wallets", icon: WalletCards },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings }
];

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <Image
        alt="BudgetFlow"
        className="h-10 w-10 rounded-lg border border-border bg-card object-cover shadow-sm"
        height={40}
        src="/icon.png"
        width={40}
      />
      <div>
        <p className="text-lg font-bold leading-none text-foreground">BudgetFlow</p>
        <p className="mt-1 text-xs text-muted-foreground">Finance dashboard</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen border-r border-border bg-card px-4 py-5 lg:flex lg:flex-col">
      <BrandMark />

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Main menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-secondary text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-lg border border-border bg-[#F8FAF9] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <LayoutGrid className="h-4 w-4 text-primary" />
          V1 Workspace
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Tools for wallets, transactions, budgets, debts, goals, reports, and exports.
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-card px-4 py-3 lg:hidden">
      <div className="mb-3">
        <BrandMark />
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "border-primary/20 bg-secondary text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
