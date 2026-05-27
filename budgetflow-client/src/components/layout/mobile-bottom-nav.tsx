"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MoreHorizontal, PieChart, ReceiptText } from "lucide-react";

import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, matches: ["/dashboard"] },
  { href: "/transactions", label: "Transactions", icon: ReceiptText, matches: ["/transactions"] },
  { href: "/budgets", label: "Budgets", icon: PieChart, matches: ["/budgets"] },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, matches: ["/calendar"] },
  { href: "/settings", label: "More", icon: MoreHorizontal, matches: ["/settings", "/notifications", "/reports"] }
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pt-2 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive && "bg-secondary text-primary"
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
