import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface DashboardListItem {
  label: string;
  helper: string;
  value: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "blue";
}

interface DashboardListProps {
  emptyMessage?: string;
  items: DashboardListItem[];
}

const toneClasses = {
  primary: "bg-secondary text-primary",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700"
};

export function DashboardList({ emptyMessage = "No records for this period.", items }: DashboardListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={`${item.label}-${item.value}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", toneClasses[item.tone ?? "primary"])}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
              <p className="truncate text-xs text-muted-foreground">{item.helper}</p>
            </div>
            <p className="number-tabular shrink-0 text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}
