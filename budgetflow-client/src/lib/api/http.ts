import type { ApiErrorPayload } from "@/types/api";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  errors?: ApiErrorPayload["errors"];

  constructor(message: string, status: number, code?: string, errors?: ApiErrorPayload["errors"]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

const getApiUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";

  return apiUrl.replace(/\/$/, "");
};

const parseResponse = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const baseUrl = getApiUrl();
  const headers = new Headers(options.headers);
  const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData);

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    body: hasJsonBody ? JSON.stringify(options.body) : (options.body as BodyInit | null | undefined),
    credentials: "include",
    headers
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    const serverMessage = typeof errorPayload?.message === "string" ? errorPayload.message : "";

    throw new ApiError(
      isSafeUserMessage(serverMessage) ? serverMessage : getSafeFallbackMessage(response.status, "request"),
      response.status,
      errorPayload?.code,
      errorPayload?.errors
    );
  }

  return payload as T;
}

export async function apiFileRequest(path: string, options: RequestInit = {}) {
  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include"
  });
  const contentType = response.headers.get("Content-Type") ?? "";

  if (!response.ok) {
    const payload = contentType.includes("application/json") ? await parseResponse(response) : null;
    const errorPayload = payload as ApiErrorPayload | null;

    throw new ApiError(
      getSafeFallbackMessage(response.status, "exportReport"),
      response.status,
      errorPayload?.code,
      errorPayload?.errors
    );
  }

  return {
    blob: await response.blob(),
    contentType,
    fileName: getFileNameFromDisposition(response.headers.get("Content-Disposition"))
  };
}

export async function apiRawRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include"
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    const serverMessage = typeof errorPayload?.message === "string" ? errorPayload.message : "";

    throw new ApiError(
      isSafeUserMessage(serverMessage) ? serverMessage : getSafeFallbackMessage(response.status, "request"),
      response.status,
      errorPayload?.code,
      errorPayload?.errors
    );
  }

  return payload as T;
}

export type ErrorOperation =
  | "addSavingContribution"
  | "aiChat"
  | "cancelTwoFactorSetup"
  | "changePassword"
  | "createBudget"
  | "createCategory"
  | "createDebt"
  | "createExport"
  | "uploadImport"
  | "confirmImport"
  | "cancelImport"
  | "createGoal"
  | "createTransaction"
  | "createWallet"
  | "deleteAccount"
  | "deleteBudget"
  | "deleteCategory"
  | "deleteDebt"
  | "deleteGoal"
  | "deleteTransaction"
  | "deleteWallet"
  | "exportReport"
  | "downloadAccountData"
  | "disableTwoFactor"
  | "loadAuditLogs"
  | "loadBudgets"
  | "loadCalendar"
  | "loadCategories"
  | "loadDashboard"
  | "loadDebts"
  | "loadExports"
  | "loadFinancialHealth"
  | "loadImports"
  | "loadGoals"
  | "loadNotifications"
  | "loadPreferences"
  | "loadRecurringTransactions"
  | "loadReport"
  | "loadSessions"
  | "loadLoginHistory"
  | "loadTwoFactor"
  | "loadTransactions"
  | "loadWallets"
  | "login"
  | "recordDebtPayment"
  | "register"
  | "regenerateRecoveryCodes"
  | "request"
  | "revokeSession"
  | "logoutOtherSessions"
  | "startTwoFactorSetup"
  | "verifyTwoFactor"
  | "verifyTwoFactorSetup"
  | "generateRecurringTransaction"
  | "updateNotification"
  | "updateBudget"
  | "updateCategory"
  | "updateDebt"
  | "updateGoal"
  | "updatePrivacyMode"
  | "updateRecurringTransaction"
  | "updateTransaction"
  | "updateWallet";

const operationMessages: Record<ErrorOperation, string> = {
  addSavingContribution: "Unable to add this contribution. Please check the details and try again.",
  aiChat: "AI analysis is unavailable right now. Please try again.",
  cancelTwoFactorSetup: "Unable to cancel 2FA setup. Please try again.",
  changePassword: "Unable to change your password. Please check the details and try again.",
  createBudget: "Unable to create this budget. Please check the details and try again.",
  createCategory: "Unable to create this category. Please check the details and try again.",
  createDebt: "Unable to create this debt. Please check the details and try again.",
  createExport: "Unable to request this export. Please check the filters and try again.",
  uploadImport: "Unable to upload this import file. Please check the file and try again.",
  confirmImport: "Unable to start this import. Please review the preview and try again.",
  cancelImport: "Unable to cancel this import. Please try again.",
  createGoal: "Unable to create this saving goal. Please check the details and try again.",
  createTransaction: "Unable to create this transaction. Please check the details and try again.",
  createWallet: "Unable to create this wallet. Please check the details and try again.",
  deleteAccount: "Unable to delete your account. Please check the confirmation and try again.",
  deleteBudget: "Unable to delete this budget. Please try again.",
  deleteCategory: "Unable to delete this category. Please try again.",
  deleteDebt: "Unable to delete this debt. Please try again.",
  deleteGoal: "Unable to delete this saving goal. Please try again.",
  deleteTransaction: "Unable to delete this transaction. Please try again.",
  deleteWallet: "Unable to delete this wallet. Please try again.",
  exportReport: "Unable to export the report. Please try again.",
  downloadAccountData: "Unable to download account data. Please try again.",
  disableTwoFactor: "Unable to disable 2FA. Please check the confirmation and try again.",
  loadAuditLogs: "Unable to load audit logs. Please try again.",
  loadBudgets: "Unable to load budgets. Please try again.",
  loadCalendar: "Unable to load calendar data. Please try again.",
  loadCategories: "Unable to load categories. Please try again.",
  loadDashboard: "Unable to load your dashboard. Please try again.",
  loadDebts: "Unable to load debts. Please try again.",
  loadExports: "Unable to load exports. Please try again.",
  loadFinancialHealth: "Unable to load financial health right now.",
  loadImports: "Unable to load imports. Please try again.",
  loadGoals: "Unable to load saving goals. Please try again.",
  loadNotifications: "Unable to load notifications. Please try again.",
  loadPreferences: "Unable to load preferences. Please try again.",
  loadRecurringTransactions: "Unable to load recurring transactions. Please try again.",
  loadReport: "Unable to load reports. Please try again.",
  loadSessions: "Unable to load active sessions. Please try again.",
  loadLoginHistory: "Unable to load login history. Please try again.",
  loadTwoFactor: "Unable to load 2FA status. Please try again.",
  loadTransactions: "Unable to load transactions. Please try again.",
  loadWallets: "Unable to load wallets. Please try again.",
  login: "Invalid email or password. Please try again.",
  recordDebtPayment: "Unable to record this payment. Please check the details and try again.",
  register: "Unable to create your account. Please check the details and try again.",
  regenerateRecoveryCodes: "Unable to regenerate recovery codes. Please check the confirmation and try again.",
  request: "We couldn't complete the request. Please try again.",
  revokeSession: "Unable to log out this session. Please try again.",
  logoutOtherSessions: "Unable to log out other devices. Please try again.",
  startTwoFactorSetup: "Unable to start 2FA setup. Please try again.",
  verifyTwoFactor: "Unable to verify the 2FA code. Please try again.",
  verifyTwoFactorSetup: "Unable to enable 2FA. Please check the code and try again.",
  generateRecurringTransaction: "Unable to generate this recurring transaction. Please try again.",
  updateNotification: "Unable to update notifications. Please try again.",
  updateBudget: "Unable to save your budget changes. Please check the details and try again.",
  updateCategory: "Unable to save your category changes. Please check the details and try again.",
  updateDebt: "Unable to save your debt changes. Please check the details and try again.",
  updateGoal: "Unable to save your saving goal changes. Please check the details and try again.",
  updatePrivacyMode: "Unable to update privacy mode. Please try again.",
  updateRecurringTransaction: "Unable to save this recurring transaction. Please check the details and try again.",
  updateTransaction: "Unable to save your transaction changes. Please check the details and try again.",
  updateWallet: "Unable to save your wallet changes. Please check the details and try again."
};

export function getFriendlyApiError(error: unknown, operation: ErrorOperation = "request") {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return operation === "login" ? operationMessages.login : "Your session has expired. Please log in again.";
    }

    if (error.status === 0 || error.code === "MISSING_API_URL") {
      return "Unable to connect. Please check your connection and try again.";
    }

    if (error.status === 429) {
      return "Too many attempts. Please wait a few minutes and try again.";
    }

    const fieldErrorMessage = getFirstSafeFieldError(error.errors);

    if (fieldErrorMessage) {
      return fieldErrorMessage;
    }

    return isSafeUserMessage(error.message) ? error.message : getSafeFallbackMessage(error.status, operation);
  }

  if (error instanceof TypeError) {
    return "Unable to connect. Please check your connection and try again.";
  }

  return operationMessages[operation] ?? operationMessages.request;
}

function getSafeFallbackMessage(status: number, operation: ErrorOperation) {
  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "You do not have permission to complete this action.";
  }

  if (status === 404) {
    return "We couldn't find the requested record. Please refresh and try again.";
  }

  if (status === 409) {
    return "This change conflicts with an existing record. Please review the details and try again.";
  }

  if (status === 429) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (status === 422 || status === 400) {
    return "Please check the details and try again.";
  }

  if (status >= 500) {
    return "The service is temporarily unavailable. Please try again later.";
  }

  return operationMessages[operation] ?? operationMessages.request;
}

function isSafeUserMessage(message: string) {
  if (!message || message.length > 180) {
    return false;
  }

  const unsafePatterns = [
    /backend/i,
    /cannot read/i,
    /database/i,
    /internal server error/i,
    /prisma/i,
    /sql/i,
    /stack/i,
    /typeerror/i,
    /undefined/i,
    /\{.*\}/
  ];

  return !unsafePatterns.some((pattern) => pattern.test(message));
}

function getFirstSafeFieldError(errors: ApiErrorPayload["errors"] | undefined) {
  if (!errors) {
    return null;
  }

  for (const value of Object.values(errors)) {
    const message = Array.isArray(value) ? value[0] : value;

    if (typeof message === "string" && isSafeUserMessage(message)) {
      return message;
    }
  }

  return null;
}

function getFileNameFromDisposition(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1].replace(/"/g, ""));
  }

  const match = contentDisposition.match(/filename="?([^";]+)"?/i);

  return match?.[1] ?? null;
}
