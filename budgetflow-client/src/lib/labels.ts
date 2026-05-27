import type {
  CategoryType,
  DebtStatus,
  DebtType,
  RecurringTransactionFrequency,
  RecurringTransactionStatus,
  SavingGoalStatus,
  TransactionPurpose,
  TransactionType,
  WalletType
} from "@/types/api";

export const walletTypeLabels: Record<WalletType, string> = {
  CASH: "Cash",
  BANK: "Bank",
  EWALLET: "E-wallet",
  CREDIT_CARD: "Credit card",
  OTHER: "Other"
};

export const categoryTypeLabels: Record<CategoryType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense"
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense"
};

export const transactionPurposeLabels: Record<TransactionPurpose, string> = {
  NORMAL: "Normal",
  DEBT_PAYMENT: "Debt payment",
  DEBT_COLLECTION: "Debt collection",
  SAVING_CONTRIBUTION: "Saving contribution"
};

export const debtTypeLabels: Record<DebtType, string> = {
  I_OWE: "I Owe",
  OWED_TO_ME: "Owed To Me"
};

export const debtStatusLabels: Record<DebtStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid"
};

export const savingGoalStatusLabels: Record<SavingGoalStatus, string> = {
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

export const recurringFrequencyLabels: Record<RecurringTransactionFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly"
};

export const recurringStatusLabels: Record<RecurringTransactionStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};
