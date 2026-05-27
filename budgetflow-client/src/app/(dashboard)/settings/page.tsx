"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Clock3,
  FileSpreadsheet,
  Info,
  Laptop,
  Loader2,
  LogOut,
  MonitorSmartphone,
  Moon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  Tablet,
  UserRound,
  type LucideIcon
} from "lucide-react";

import { AccountTrustSections } from "@/components/settings/account-trust-sections";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSecuritySessions } from "@/hooks/use-security-sessions";
import { getFriendlyApiError } from "@/lib/api/http";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import type { SecuritySession } from "@/types/api";

type PendingAction =
  | {
      type: "revoke";
      session: SecuritySession;
    }
  | {
      type: "logoutOthers";
    }
  | null;

export default function SettingsPage() {
  const { logout, user } = useAuth();
  const { setTheme, theme } = useTheme();
  const {
    errorMessage: preferenceError,
    isLoading: isPreferencesLoading,
    isUpdatingPrivacyMode,
    privacyModeEnabled,
    updatePrivacyMode
  } = usePreferences();
  const { errorMessage: sessionsError, isLoading: isSessionsLoading, logoutOtherSessions, reload, revokeSession, sessions } =
    useSecuritySessions();
  const { showToast } = useToast();
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const otherSessionCount = sessions.filter((session) => !session.isCurrent).length;

  const handlePrivacyToggle = async () => {
    const nextValue = !privacyModeEnabled;

    try {
      await updatePrivacyMode(nextValue);
      showToast({
        title: nextValue ? "Privacy mode enabled" : "Privacy mode disabled",
        variant: "success"
      });
    } catch (error) {
      showToast({
        title: "Privacy mode was not updated",
        description: getFriendlyApiError(error, "updatePrivacyMode"),
        variant: "error"
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    setIsConfirming(true);

    try {
      if (pendingAction.type === "logoutOthers") {
        const result = await logoutOtherSessions();
        showToast({
          title: "Other devices logged out",
          description: `${result.revokedCount} session${result.revokedCount === 1 ? "" : "s"} revoked.`,
          variant: "success"
        });
      } else {
        const result = await revokeSession(pendingAction.session.id);
        showToast({
          title: result.revokedCurrentSession ? "Current session logged out" : "Session logged out",
          variant: "success"
        });

        if (result.revokedCurrentSession) {
          await logout();
          router.replace("/login");
        }
      }

      setPendingAction(null);
    } catch (error) {
      showToast({
        title: "Session action failed",
        description: getFriendlyApiError(error, pendingAction.type === "logoutOthers" ? "logoutOtherSessions" : "revokeSession"),
        variant: "error"
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account security, data controls, privacy settings, and active sessions."
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="Profile" description="Authenticated account information.">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{user?.name ?? "BudgetFlow user"}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email ?? "Authenticated session"}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Appearance" description="Choose how BudgetFlow looks on this device.">
          <div className="grid grid-cols-2 gap-2">
            <ThemeOptionButton
              active={theme === "light"}
              icon={Sun}
              label="Light"
              onClick={() => setTheme("light")}
            />
            <ThemeOptionButton
              active={theme === "dark"}
              icon={Moon}
              label="Dark"
              onClick={() => setTheme("dark")}
            />
          </div>
        </SectionCard>

        <SectionCard title="Preferences" description="Display preferences for your workspace.">
          <div className="space-y-3 text-sm">
            <SettingRow icon={Bell} label="Reminders" value="Not configured in V1" />
            <SettingRow icon={Settings} label="Currency" value="Indonesian Rupiah" />
          </div>
        </SectionCard>

        <SectionCard title="App Information" description="Capabilities and status. Exports are managed from Reports.">
          <div className="space-y-3 text-sm">
            <SettingRow icon={Info} label="Version" value="V1" />
            <SettingRow icon={Info} label="Session" value="Authenticated" />
            <SettingRow icon={FileSpreadsheet} label="Report downloads" value="XLSX and CSV" />
            <SettingRow
              icon={FileSpreadsheet}
              label="Background exports"
              value={
                <Link className="font-semibold text-primary hover:text-primary/80" href="/reports">
                  Open Reports
                </Link>
              }
            />
          </div>
        </SectionCard>
      </div>

      <AccountTrustSections
        onAccountDeleted={async () => {
          await logout();
          router.replace("/login");
        }}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <SectionCard title="Privacy Mode" description="Hide sensitive financial values across BudgetFlow.">
          <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="font-semibold text-foreground">Privacy Mode</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sensitive balances, transaction amounts, budget values, reports, chart labels, and AI financial summaries will be masked.
              </p>
              {preferenceError ? <p className="mt-2 text-sm text-red-600">{preferenceError}</p> : null}
            </div>
            <PrivacyToggle
              checked={privacyModeEnabled}
              disabled={isPreferencesLoading || isUpdatingPrivacyMode}
              isLoading={isUpdatingPrivacyMode}
              onClick={handlePrivacyToggle}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Active Sessions"
          description="Review signed-in devices and log out sessions you no longer recognize."
          action={
            <div className="flex flex-wrap gap-2">
              <Button disabled={isSessionsLoading} onClick={() => void reload()} size="sm" type="button" variant="outline">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                disabled={isSessionsLoading || otherSessionCount === 0}
                onClick={() => setPendingAction({ type: "logoutOthers" })}
                size="sm"
                type="button"
                variant="outline"
              >
                <LogOut className="h-4 w-4" />
                Log out others
              </Button>
            </div>
          }
        >
          {isSessionsLoading ? <SessionsLoadingState /> : null}

          {!isSessionsLoading && sessionsError ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <p>{sessionsError}</p>
              <Button className="mt-3" onClick={() => void reload()} type="button" variant="outline">
                Retry
              </Button>
            </div>
          ) : null}

          {!isSessionsLoading && !sessionsError ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  onRevoke={(nextSession) => setPendingAction({ type: "revoke", session: nextSession })}
                  session={session}
                />
              ))}
              {otherSessionCount === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
                  You're only logged in on this device.
                </div>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </section>

      <ConfirmDialog
        confirmLabel={getConfirmLabel(pendingAction)}
        description={getConfirmDescription(pendingAction)}
        isConfirming={isConfirming}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void handleConfirmAction()}
        open={Boolean(pendingAction)}
        title={getConfirmTitle(pendingAction)}
        variant="destructive"
      />
    </div>
  );
}

function SettingRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-border p-3">
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </div>
      <span className="shrink-0 text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function ThemeOptionButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-secondary text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PrivacyToggle({
  checked,
  disabled,
  isLoading,
  onClick
}: {
  checked: boolean;
  disabled: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label="Toggle privacy mode"
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "border-primary bg-primary" : "border-border bg-muted"
      )}
      disabled={disabled}
      onClick={onClick}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-card shadow-sm transition-transform",
          checked && "translate-x-5"
        )}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : checked ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
      </span>
    </button>
  );
}

function SessionRow({ onRevoke, session }: { onRevoke: (session: SecuritySession) => void; session: SecuritySession }) {
  const Icon = getDeviceIcon(session.deviceType);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{session.deviceName}</p>
            {session.isCurrent ? <Badge variant="default">Current device</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.browser} on {session.operatingSystem} - {session.deviceType}
          </p>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <span>IP address: {session.ipAddress}</span>
            <span>Signed in: {formatDateTime(session.createdAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              Last active {formatRelativeTime(session.lastActiveAt)}
            </span>
          </div>
        </div>
      </div>
      <Button onClick={() => onRevoke(session)} size="sm" type="button" variant={session.isCurrent ? "destructive" : "outline"}>
        <LogOut className="h-4 w-4" />
        {session.isCurrent ? "Log out" : "Log out device"}
      </Button>
    </div>
  );
}

function SessionsLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border p-4">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-8 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function getDeviceIcon(deviceType: string) {
  if (/mobile/i.test(deviceType)) {
    return Smartphone;
  }

  if (/tablet/i.test(deviceType)) {
    return Tablet;
  }

  if (/desktop/i.test(deviceType)) {
    return Laptop;
  }

  return MonitorSmartphone;
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);

  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function getConfirmTitle(action: PendingAction) {
  if (action?.type === "logoutOthers") {
    return "Log out other devices?";
  }

  if (action?.type === "revoke" && action.session.isCurrent) {
    return "Log out this device?";
  }

  return "Log out this session?";
}

function getConfirmDescription(action: PendingAction) {
  if (action?.type === "logoutOthers") {
    return "Every other active BudgetFlow session will be revoked. This device will stay signed in.";
  }

  if (action?.type === "revoke" && action.session.isCurrent) {
    return "This will revoke your current session and send you back to the login page.";
  }

  return action?.type === "revoke"
    ? `This will revoke ${action.session.deviceName}. That device will need to log in again.`
    : "";
}

function getConfirmLabel(action: PendingAction) {
  if (action?.type === "logoutOthers") {
    return "Log out others";
  }

  return "Log out";
}
