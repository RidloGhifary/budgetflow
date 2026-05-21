"use client";

import { Bell, Info, Settings, UserRound, type LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAuth } from "@/providers/auth-provider";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account details and lightweight V1 app preferences for the signed-in workspace."
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Profile" description="Authenticated account information.">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{user?.name ?? "BudgetFlow user"}</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? "Authenticated session"}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Preferences" description="Display preferences for the dashboard.">
          <div className="space-y-3 text-sm">
            <SettingRow icon={Bell} label="Reminders" value="Not configured in V1" />
            <SettingRow icon={Settings} label="Currency" value="Indonesian Rupiah" />
          </div>
        </SectionCard>

        <SectionCard title="App Information" description="Current product and integration status.">
          <div className="space-y-3 text-sm">
            <SettingRow icon={Info} label="Version" value="V1" />
            <SettingRow icon={Info} label="Sync" value="Connected" />
            <SettingRow icon={Info} label="Exports" value="XLSX and CSV" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
