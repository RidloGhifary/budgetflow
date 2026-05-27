import type { ReactNode } from "react";

export type TransactionType = "INCOME" | "EXPENSE";

export type DebtStatus = "UNPAID" | "PARTIAL" | "PAID";

export type BudgetStatus = "SAFE" | "WARNING" | "OVER_BUDGET";

export type GoalStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type WalletType = "Cash" | "Bank" | "E-Wallet" | "Credit Card";

export type TrendDirection = "up" | "down" | "flat";

export type StatusTone = "success" | "warning" | "danger" | "muted" | "primary";

export interface FinancialSummary {
  label: string;
  amount: number;
  comparison: string;
  trend: TrendDirection;
  helper: string;
  featured?: boolean;
}

export interface SecondaryMetric {
  label: string;
  value: ReactNode;
  helper: ReactNode;
  progress?: number;
  tone: StatusTone;
}

export interface MonthlyFlow {
  month: string;
  income: number;
  expense: number;
}

export interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

export interface TransactionPreview {
  id: string;
  name: string;
  category: string;
  wallet: string;
  date: string;
  amount: number;
  type: TransactionType;
}

export interface BudgetPreview {
  category: string;
  limit: number;
  used: number;
  status: BudgetStatus;
  color: string;
}

export interface DebtPreview {
  title: string;
  person: string;
  total: number;
  paid: number;
  dueDate: string;
  type: "I owe" | "Owed to me";
  status: DebtStatus;
}

export interface SavingGoalPreview {
  name: string;
  target: number;
  current: number;
  deadline: string;
  status: GoalStatus;
}

export interface WalletPreview {
  name: string;
  type: WalletType;
  balance: number;
  helper: string;
}

export interface CategoryPreview {
  name: string;
  type: TransactionType;
  color: string;
  monthlyTotal: number;
}
