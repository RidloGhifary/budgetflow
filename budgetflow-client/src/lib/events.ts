export const appEvents = {
  createTransactionRequested: "budgetflow:create-transaction-requested",
  transactionsChanged: "budgetflow:transactions-changed"
} as const;

export function dispatchTransactionsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(appEvents.transactionsChanged));
}

export function subscribeToTransactionsChanged(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(appEvents.transactionsChanged, callback);

  return () => window.removeEventListener(appEvents.transactionsChanged, callback);
}

export function dispatchCreateTransactionRequested() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(appEvents.createTransactionRequested));
}

export function subscribeToCreateTransactionRequested(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(appEvents.createTransactionRequested, callback);

  return () => window.removeEventListener(appEvents.createTransactionRequested, callback);
}
