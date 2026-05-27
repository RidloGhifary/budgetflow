import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: ReactNode;
  helper: ReactNode;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "blue";
}

const toneClasses = {
  primary: "bg-secondary text-primary",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
  danger: "bg-red-500/15 text-red-700 dark:text-red-200",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-200"
};

export function StatTile({ label, value, helper, icon: Icon, tone = "primary" }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-soft sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="number-tabular text-lg font-bold text-foreground sm:text-xl">{value}</p>
        </div>
        <div className={cn("rounded-md p-2", toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground sm:mt-3">{helper}</p>
    </div>
  );
}
