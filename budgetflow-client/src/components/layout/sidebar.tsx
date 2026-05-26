"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CreditCard,
  Goal,
  History,
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  ReceiptText,
  Repeat2,
  Settings,
  Tags,
  WalletCards,
  type LucideIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getFriendlyApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const sidebarItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/recurring", label: "Recurring", icon: Repeat2 },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/debts", label: "Debts", icon: CreditCard },
  { href: "/goals", label: "Saving Goals", icon: Goal },
  { href: "/wallets", label: "Wallets", icon: WalletCards },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/activity", label: "Activity", icon: History },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className={cn(
        "hidden h-dvh max-h-dvh overflow-hidden border-r border-border bg-card py-4 transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:flex-col",
        collapsed ? "w-[88px] px-3" : "w-[300px] px-4"
      )}
    >
      {collapsed ? <CollapsedExpandButton onToggle={onToggle} /> : <ExpandedBrandHeader onToggle={onToggle} />}

      <nav aria-label="Sidebar navigation" className="mt-5 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        {sidebarItems.map((item) => (
          <SidebarLink collapsed={collapsed} item={item} key={item.href} pathname={pathname} />
        ))}
      </nav>

      <div className="mt-3 shrink-0 border-t border-border pt-3">
        <Button
          aria-label="Log out"
          className={cn("h-10 w-full", collapsed ? "px-0" : "justify-start")}
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          size={collapsed ? "icon" : "default"}
          title="Log out"
          type="button"
          variant="outline"
        >
          <LogOut className="h-4 w-4" />
          {collapsed ? null : isLoggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </aside>
  );
}

function ExpandedBrandHeader({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3">
      <BrandMark />
      <Button
        aria-label="Collapse sidebar"
        className="h-9 w-9 shrink-0"
        onClick={onToggle}
        size="icon"
        title="Collapse sidebar"
        type="button"
        variant="ghost"
      >
        <PanelLeftClose className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CollapsedExpandButton({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      aria-label="Expand sidebar"
      className="group relative flex h-11 w-full shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onToggle}
      title="Expand sidebar"
      type="button"
    >
      <Image
        alt=""
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-lg border border-border bg-card object-cover shadow-sm transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
        height={40}
        src="/icon.png"
        width={40}
      />
      <PanelLeftOpen className="absolute h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}

function BrandMark() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Image
        alt="BudgetFlow"
        className="h-10 w-10 shrink-0 rounded-lg border border-border bg-card object-cover shadow-sm"
        height={40}
        src="/icon.png"
        width={40}
      />
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-foreground">BudgetFlow</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">Finance dashboard</p>
      </div>
    </div>
  );
}

function SidebarLink({ collapsed, item, pathname }: { collapsed: boolean; item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const isActive = isActiveRoute(pathname, item.href);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-9 items-center rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        isActive && "bg-secondary text-primary"
      )}
      href={item.href}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
