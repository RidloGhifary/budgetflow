"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  History,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { securitySessionsApi } from "@/lib/api/security-sessions.api";
import { getFriendlyApiError } from "@/lib/api/http";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import type { LoginHistoryItem, TwoFactorSetup, TwoFactorStatus } from "@/types/api";

interface AccountTrustSectionsProps {
  onAccountDeleted: () => Promise<void>;
}

type TwoFactorAction = "disable" | "regenerate";

const initialTwoFactorStatus: TwoFactorStatus = {
  enabled: false,
  enabledAt: null,
  pendingSetup: false,
  recoveryCodesRemaining: 0
};

export function AccountTrustSections({ onAccountDeleted }: AccountTrustSectionsProps) {
  const { showToast } = useToast();
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus>(initialTwoFactorStatus);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(true);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [changePasswordState, setChangePasswordState] = useState({
    confirmNewPassword: "",
    currentPassword: "",
    newPassword: ""
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [twoFactorConfirmState, setTwoFactorConfirmState] = useState({ code: "", password: "" });
  const [twoFactorAction, setTwoFactorAction] = useState<TwoFactorAction | null>(null);
  const [isTwoFactorWorking, setIsTwoFactorWorking] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteState, setDeleteState] = useState({ code: "", confirmation: "", password: "" });

  const loadSecurityData = useCallback(async () => {
    setIsLoadingSecurity(true);
    setSecurityError(null);

    try {
      const [twoFactorResponse, loginHistoryResponse] = await Promise.all([
        securitySessionsApi.getTwoFactorStatus(),
        securitySessionsApi.getLoginHistory()
      ]);
      setTwoFactorStatus(twoFactorResponse.data.status);
      setLoginHistory(loginHistoryResponse.data.history);
    } catch (error) {
      setSecurityError(getFriendlyApiError(error, "loadTwoFactor"));
    } finally {
      setIsLoadingSecurity(false);
    }
  }, []);

  useEffect(() => {
    void loadSecurityData();
  }, [loadSecurityData]);

  const hasPasswordMismatch =
    changePasswordState.confirmNewPassword.length > 0 &&
    changePasswordState.newPassword !== changePasswordState.confirmNewPassword;
  const deleteConfirmationValid = deleteState.confirmation === "DELETE";
  const loginHistoryPreview = useMemo(() => loginHistory.slice(0, 8), [loginHistory]);

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (hasPasswordMismatch) {
      setPasswordMessage("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await securitySessionsApi.changePassword(changePasswordState);
      setChangePasswordState({ confirmNewPassword: "", currentPassword: "", newPassword: "" });
      setPasswordMessage("Password updated.");
      showToast({ title: "Password changed", variant: "success" });
      await loadSecurityData();
    } catch (error) {
      setPasswordMessage(getFriendlyApiError(error, "changePassword"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleStartTwoFactorSetup = async () => {
    setIsTwoFactorWorking(true);
    setRecoveryCodes([]);

    try {
      const response = await securitySessionsApi.startTwoFactorSetup();
      setTwoFactorSetup(response.data.setup);
      setTwoFactorStatus((current) => ({ ...current, pendingSetup: true }));
    } catch (error) {
      showToast({
        title: "2FA setup did not start",
        description: getFriendlyApiError(error, "startTwoFactorSetup"),
        variant: "error"
      });
    } finally {
      setIsTwoFactorWorking(false);
    }
  };

  const handleVerifyTwoFactorSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsTwoFactorWorking(true);

    try {
      const response = await securitySessionsApi.verifyTwoFactorSetup({ code: twoFactorCode });
      setRecoveryCodes(response.data.recoveryCodes);
      setTwoFactorStatus(response.data.status);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      showToast({ title: "2FA enabled", variant: "success" });
      await loadSecurityData();
    } catch (error) {
      showToast({
        title: "2FA was not enabled",
        description: getFriendlyApiError(error, "verifyTwoFactorSetup"),
        variant: "error"
      });
    } finally {
      setIsTwoFactorWorking(false);
    }
  };

  const handleCancelTwoFactorSetup = async () => {
    setIsTwoFactorWorking(true);

    try {
      const response = await securitySessionsApi.cancelTwoFactorSetup();
      setTwoFactorStatus(response.data.status);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
    } catch (error) {
      showToast({
        title: "2FA setup was not cancelled",
        description: getFriendlyApiError(error, "cancelTwoFactorSetup"),
        variant: "error"
      });
    } finally {
      setIsTwoFactorWorking(false);
    }
  };

  const handleTwoFactorConfirmation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!twoFactorAction) {
      return;
    }

    setIsTwoFactorWorking(true);

    try {
      if (twoFactorAction === "disable") {
        const response = await securitySessionsApi.disableTwoFactor(twoFactorConfirmState);
        setTwoFactorStatus(response.data.status);
        setRecoveryCodes([]);
        showToast({ title: "2FA disabled", variant: "success" });
      } else {
        const response = await securitySessionsApi.regenerateRecoveryCodes(twoFactorConfirmState);
        setTwoFactorStatus(response.data.status);
        setRecoveryCodes(response.data.recoveryCodes);
        showToast({ title: "Recovery codes regenerated", variant: "success" });
      }

      setTwoFactorAction(null);
      setTwoFactorConfirmState({ code: "", password: "" });
      await loadSecurityData();
    } catch (error) {
      showToast({
        title: twoFactorAction === "disable" ? "2FA was not disabled" : "Recovery codes were not regenerated",
        description: getFriendlyApiError(error, twoFactorAction === "disable" ? "disableTwoFactor" : "regenerateRecoveryCodes"),
        variant: "error"
      });
    } finally {
      setIsTwoFactorWorking(false);
    }
  };

  const handleDownloadAccountData = async () => {
    setIsDownloadingData(true);

    try {
      const file = await securitySessionsApi.downloadAccountData();
      downloadFile(file);
      showToast({ title: "Account data downloaded", variant: "success" });
      await loadSecurityData();
    } catch (error) {
      showToast({
        title: "Account data was not downloaded",
        description: getFriendlyApiError(error, "downloadAccountData"),
        variant: "error"
      });
    } finally {
      setIsDownloadingData(false);
    }
  };

  const handleDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!deleteConfirmationValid) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      await securitySessionsApi.deleteAccount({
        code: deleteState.code || undefined,
        confirmation: "DELETE",
        password: deleteState.password
      });
      showToast({ title: "Account deleted", variant: "success" });
      await onAccountDeleted();
    } catch (error) {
      showToast({
        title: "Account was not deleted",
        description: getFriendlyApiError(error, "deleteAccount"),
        variant: "error"
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionCard title="Account Security" description="Update your password to keep your account secure.">
          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div className="grid gap-4 sm:grid-cols-3">
              <PasswordField
                label="Current password"
                onChange={(value) => setChangePasswordState((current) => ({ ...current, currentPassword: value }))}
                value={changePasswordState.currentPassword}
              />
              <PasswordField
                label="New password"
                onChange={(value) => setChangePasswordState((current) => ({ ...current, newPassword: value }))}
                value={changePasswordState.newPassword}
              />
              <PasswordField
                label="Confirm new password"
                onChange={(value) => setChangePasswordState((current) => ({ ...current, confirmNewPassword: value }))}
                value={changePasswordState.confirmNewPassword}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className={cn("text-sm", passwordMessage === "Password updated." ? "text-primary" : "text-muted-foreground")}>
                {passwordMessage ?? "Choose a strong password that you do not use elsewhere."}
              </p>
              <Button
                className="sm:w-auto"
                disabled={isChangingPassword || hasPasswordMismatch}
                type="submit"
              >
                {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Change password
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Two-Factor Authentication"
          description="Add an extra layer of security using an authenticator app."
          action={
            isLoadingSecurity ? (
              <Badge variant="outline">Loading</Badge>
            ) : twoFactorStatus.enabled ? (
              <Badge variant="default">Enabled</Badge>
            ) : (
              <Badge variant="outline">Off</Badge>
            )
          }
        >
          {securityError ? (
            <ErrorPanel message={securityError} onRetry={() => void loadSecurityData()} />
          ) : null}

          {!securityError && isLoadingSecurity ? <SecurityLoadingState /> : null}

          {!securityError && !isLoadingSecurity ? (
            <div className="space-y-4">
              <TwoFactorStatusPanel status={twoFactorStatus} />

              {!twoFactorStatus.enabled && !twoFactorSetup ? (
                <Button disabled={isTwoFactorWorking} onClick={() => void handleStartTwoFactorSetup()} type="button">
                  {isTwoFactorWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Enable 2FA
                </Button>
              ) : null}

              {twoFactorSetup ? (
                <form className="space-y-4 rounded-lg border border-border p-4" onSubmit={handleVerifyTwoFactorSetup}>
                  <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="rounded-md border border-border bg-white p-3">
                      <Image alt="2FA setup QR code" height={220} src={twoFactorSetup.qrCodeDataUrl} width={220} />
                    </div>
                    <div className="min-w-0 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground">Scan this QR code</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Scan it with an authenticator app, then enter the 6-digit code.
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Setup key</p>
                        <p className="mt-1 break-all font-mono text-sm text-foreground">{twoFactorSetup.manualKey}</p>
                      </div>
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-foreground">Authenticator code</span>
                        <Input
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          onChange={(event) => setTwoFactorCode(event.target.value)}
                          placeholder="123456"
                          required
                          value={twoFactorCode}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button disabled={isTwoFactorWorking} onClick={() => void handleCancelTwoFactorSetup()} type="button" variant="outline">
                      Cancel
                    </Button>
                    <Button disabled={isTwoFactorWorking || twoFactorCode.trim().length < 6} type="submit">
                      {isTwoFactorWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Verify setup
                    </Button>
                  </div>
                </form>
              ) : null}

              {recoveryCodes.length > 0 ? (
                <RecoveryCodesPanel codes={recoveryCodes} onCopy={() => void copyRecoveryCodes(recoveryCodes, showToast)} />
              ) : null}

              {twoFactorStatus.enabled ? (
                <TwoFactorManagement
                  action={twoFactorAction}
                  disabled={isTwoFactorWorking}
                  onActionChange={setTwoFactorAction}
                  onChange={setTwoFactorConfirmState}
                  onSubmit={handleTwoFactorConfirmation}
                  state={twoFactorConfirmState}
                />
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SectionCard
          title="Login History"
          description="Review recent sign-ins and security activity."
          action={
            <Button disabled={isLoadingSecurity} onClick={() => void loadSecurityData()} size="sm" type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          }
        >
          {isLoadingSecurity ? <SecurityLoadingState /> : null}
          {!isLoadingSecurity && securityError ? <ErrorPanel message={securityError} onRetry={() => void loadSecurityData()} /> : null}
          {!isLoadingSecurity && !securityError ? (
            <div className="space-y-3">
              {loginHistoryPreview.length > 0 ? (
                loginHistoryPreview.map((item) => <LoginHistoryRow item={item} key={item.id} />)
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  No login history yet.
                </div>
              )}
            </div>
          ) : null}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Account Data" description="Download a copy of your BudgetFlow data.">
            <div className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Passwords, tokens, 2FA secrets, and raw recovery codes are never included.
              </p>
              <Button disabled={isDownloadingData} onClick={() => void handleDownloadAccountData()} type="button">
                {isDownloadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download account data
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            className="border-destructive/30"
            title="Danger Zone"
            description="Deleting your account is permanent."
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div>
                    <p className="font-semibold text-foreground">Delete account</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Your account access and personal BudgetFlow data will be removed according to the app's deletion policy.
                    </p>
                  </div>
                </div>
              </div>

              {!showDeleteForm ? (
                <Button onClick={() => setShowDeleteForm(true)} type="button" variant="destructive">
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </Button>
              ) : (
                <form className="space-y-4 rounded-lg border border-border p-4" onSubmit={handleDeleteAccount}>
                  <PasswordField
                    label="Current password"
                    onChange={(value) => setDeleteState((current) => ({ ...current, password: value }))}
                    value={deleteState.password}
                  />
                  {twoFactorStatus.enabled ? (
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">2FA or recovery code</span>
                      <Input
                        autoComplete="one-time-code"
                        onChange={(event) => setDeleteState((current) => ({ ...current, code: event.target.value }))}
                        placeholder="123456 or recovery code"
                        required
                        value={deleteState.code}
                      />
                    </label>
                  ) : null}
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">Type DELETE to confirm</span>
                    <Input
                      onChange={(event) => setDeleteState((current) => ({ ...current, confirmation: event.target.value }))}
                      placeholder="DELETE"
                      required
                      value={deleteState.confirmation}
                    />
                  </label>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      disabled={isDeletingAccount}
                      onClick={() => {
                        setShowDeleteForm(false);
                        setDeleteState({ code: "", confirmation: "", password: "" });
                      }}
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={
                        isDeletingAccount ||
                        !deleteConfirmationValid ||
                        !deleteState.password ||
                        (twoFactorStatus.enabled && !deleteState.code.trim())
                      }
                      type="submit"
                      variant="destructive"
                    >
                      {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Permanently delete account
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

function PasswordField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Input
        autoComplete={label === "Current password" ? "current-password" : "new-password"}
        onChange={(event) => onChange(event.target.value)}
        required
        type="password"
        value={value}
      />
    </label>
  );
}

function TwoFactorStatusPanel({ status }: { status: TwoFactorStatus }) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
      <span className="text-muted-foreground">Status</span>
      <span className="font-medium text-foreground">{status.enabled ? "Enabled" : status.pendingSetup ? "Setup in progress" : "Not enabled"}</span>
      <span className="text-muted-foreground">Recovery codes remaining</span>
      <span className="font-medium text-foreground">{status.enabled ? status.recoveryCodesRemaining : "Not generated yet"}</span>
      {status.enabledAt ? (
        <>
          <span className="text-muted-foreground">Enabled</span>
          <span className="font-medium text-foreground">{formatDateTime(status.enabledAt)}</span>
        </>
      ) : null}
    </div>
  );
}

function RecoveryCodesPanel({ codes, onCopy }: { codes: string[]; onCopy: () => void }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">Save these recovery codes somewhere safe.</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Each code can only be used once. BudgetFlow will not show this set again.</p>
        </div>
        <Button onClick={onCopy} size="sm" type="button" variant="outline">
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {codes.map((code) => (
          <code className="rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground" key={code}>
            {code}
          </code>
        ))}
      </div>
    </div>
  );
}

function TwoFactorManagement({
  action,
  disabled,
  onActionChange,
  onChange,
  onSubmit,
  state
}: {
  action: TwoFactorAction | null;
  disabled: boolean;
  onActionChange: (action: TwoFactorAction | null) => void;
  onChange: (state: { code: string; password: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  state: { code: string; password: string };
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={() => onActionChange("regenerate")} type="button" variant="outline">
          <RefreshCw className="h-4 w-4" />
          Regenerate codes
        </Button>
        <Button disabled={disabled} onClick={() => onActionChange("disable")} type="button" variant="destructive">
          <X className="h-4 w-4" />
          Disable 2FA
        </Button>
      </div>

      {action ? (
        <form className="space-y-4 rounded-lg border border-border p-4" onSubmit={onSubmit}>
          <p className="text-sm leading-6 text-muted-foreground">
            Confirm with your password and an authenticator or recovery code.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              label="Current password"
              onChange={(value) => onChange({ ...state, password: value })}
              value={state.password}
            />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">2FA or recovery code</span>
              <Input
                autoComplete="one-time-code"
                onChange={(event) => onChange({ ...state, code: event.target.value })}
                placeholder="123456 or recovery code"
                required
                value={state.code}
              />
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button disabled={disabled} onClick={() => onActionChange(null)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={disabled || !state.password || !state.code.trim()} type="submit" variant={action === "disable" ? "destructive" : "default"}>
              {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {action === "disable" ? "Disable 2FA" : "Regenerate codes"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function LoginHistoryRow({ item }: { item: LoginHistoryItem }) {
  const success = item.status === "SUCCESS";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
            <History className="h-4 w-4" />
          </span>
          <p className="font-semibold text-foreground">{getLoginHistoryLabel(item)}</p>
          <Badge variant={success ? "default" : "danger"}>{success ? "Success" : "Failed"}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {item.browser} on {item.operatingSystem} - {item.deviceType}
        </p>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <span>IP address: {item.ipAddress}</span>
          <span>{formatDateTime(item.createdAt)}</span>
          {item.failureReason ? <span>Reason: {formatFailureReason(item.failureReason)}</span> : null}
          {item.twoFactorRequired ? <span>{item.recoveryCodeUsed ? "Recovery code used" : "2FA required"}</span> : null}
        </div>
      </div>
    </div>
  );
}

function SecurityLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <div className="rounded-lg border border-border p-4" key={index}>
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-8 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <p>{message}</p>
      <Button className="mt-3" onClick={onRetry} type="button" variant="outline">
        Retry
      </Button>
    </div>
  );
}

async function copyRecoveryCodes(codes: string[], showToast: ReturnType<typeof useToast>["showToast"]) {
  try {
    await navigator.clipboard.writeText(codes.join("\n"));
    showToast({ title: "Recovery codes copied", variant: "success" });
  } catch {
    showToast({ title: "Recovery codes were not copied", variant: "error" });
  }
}

function downloadFile(file: { blob: Blob; fileName: string | null }) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName ?? "budgetflow-account-data.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getLoginHistoryLabel(item: LoginHistoryItem) {
  if (item.method === "PASSWORD_CHANGE") {
    return "Password changed";
  }

  if (item.method === "ACCOUNT_DATA_DOWNLOAD") {
    return "Account data downloaded";
  }

  if (item.method === "ACCOUNT_DELETE") {
    return "Account deletion confirmed";
  }

  if (item.recoveryCodeUsed) {
    return item.status === "SUCCESS" ? "Recovery code used" : "Recovery code failed";
  }

  if (item.twoFactorRequired && item.method === "TOTP") {
    return item.status === "SUCCESS" ? "2FA login" : "2FA verification failed";
  }

  return item.status === "SUCCESS" ? "Successful login" : "Failed login";
}

function formatFailureReason(reason: string) {
  return reason
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
