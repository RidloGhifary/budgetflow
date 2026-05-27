export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  privacyModeEnabled: boolean;
  updatedAt: string;
}

export interface SecuritySession {
  id: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  deviceName: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface TwoFactorStatus {
  enabled: boolean;
  enabledAt?: string | null;
  pendingSetup: boolean;
  recoveryCodesRemaining: number;
}

export interface TwoFactorSetup {
  manualKey: string;
  otpAuthUrl: string;
  qrCodeDataUrl: string;
}

export interface LoginHistoryItem {
  id: string;
  browser: string;
  createdAt: string;
  deviceType: string;
  failureReason?: string | null;
  ipAddress: string;
  method: "PASSWORD" | "TOTP" | "RECOVERY_CODE" | string;
  operatingSystem: string;
  recoveryCodeUsed: boolean;
  sessionId?: string | null;
  status: "SUCCESS" | "FAILURE" | string;
  twoFactorPassed: boolean;
  twoFactorRequired: boolean;
}

export type NotificationCategory =
  | "FINANCE"
  | "BUDGET"
  | "TRANSACTION"
  | "RECURRING_TRANSACTION"
  | "SECURITY"
  | "PRIVACY"
  | "SYSTEM";

export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  status: NotificationStatus;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BackgroundJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type DataExportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED" | "CANCELLED";

export type DataExportFormat = "CSV";

export type DataExportType = "TRANSACTIONS";

export interface DataExportJobSummary {
  status: BackgroundJobStatus;
  progress: number;
  attempts: number;
  maxAttempts: number;
}

export interface DataExport {
  id: string;
  userId: string;
  exportType: DataExportType;
  format: DataExportFormat;
  status: DataExportStatus;
  filters?: Record<string, unknown> | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  rowCount?: number | null;
  errorMessage?: string | null;
  requestedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  expiresAt?: string | null;
  downloadedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  job?: DataExportJobSummary | null;
}

export type DataImportStatus =
  | "UPLOADED"
  | "PARSING"
  | "AWAITING_CONFIRMATION"
  | "PROCESSING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED"
  | "CANCELLED";

export type DataImportRowStatus = "VALID" | "INVALID" | "DUPLICATE" | "IMPORTED" | "SKIPPED" | "FAILED";

export type DataImportFormat = "CSV" | "XLSX";

export type DataImportType = "TRANSACTIONS";

export interface DataImportJobSummary {
  status: BackgroundJobStatus;
  progress: number;
  attempts: number;
  maxAttempts: number;
}

export interface DataImport {
  id: string;
  userId: string;
  importType: DataImportType;
  format: DataImportFormat;
  status: DataImportStatus;
  originalFileName: string;
  fileSize: number;
  mimeType?: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  skippedRows: number;
  duplicateRows: number;
  failedRows: number;
  errorMessage?: string | null;
  mapping?: Record<string, unknown> | null;
  options?: Record<string, unknown> | null;
  summary?: Record<string, unknown> | null;
  requestedAt: string;
  parsedAt?: string | null;
  confirmedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  job?: DataImportJobSummary | null;
}

export interface DataImportRow {
  id: string;
  importId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalizedData?: Record<string, unknown> | null;
  validationStatus: DataImportRowStatus;
  validationErrors?: unknown[] | null;
  duplicateKey?: string | null;
  matchedWalletId?: string | null;
  matchedCategoryId?: string | null;
  createdTransactionId?: string | null;
  skippedReason?: string | null;
  importedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AuditLogResult = "SUCCESS" | "FAILURE" | "DENIED";

export type AuditLogSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AuditLogSummary {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  result: AuditLogResult;
  severity: AuditLogSeverity;
  ipAddress?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  deviceType?: string | null;
  sessionId?: string | null;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLogSummary {
  userAgent?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  errorMessage?: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type WalletType = "CASH" | "BANK" | "EWALLET" | "CREDIT_CARD" | "OTHER";

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export type CategoryType = "INCOME" | "EXPENSE";

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionPurpose = "NORMAL" | "DEBT_PAYMENT" | "DEBT_COLLECTION" | "SAVING_CONTRIBUTION";

export type RecurringTransactionFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type RecurringTransactionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export type RecurringTransactionOccurrenceStatus = "GENERATED" | "FAILED";

export interface TransactionWalletSummary {
  id: string;
  name: string;
  type: WalletType;
  currentBalance: number;
}

export interface TransactionCategorySummary {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string;
  recurringTransactionId?: string | null;
  type: TransactionType;
  purpose: TransactionPurpose;
  amount: number;
  transactionDate: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  wallet?: TransactionWalletSummary;
  category?: TransactionCategorySummary;
}

export interface RecurringTransaction {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string;
  name: string;
  note?: string | null;
  type: TransactionType;
  amount: number;
  frequency: RecurringTransactionFrequency;
  interval: number;
  startDate: string;
  endDate?: string | null;
  nextRunDate?: string | null;
  lastRunDate?: string | null;
  status: RecurringTransactionStatus;
  autoGenerate: boolean;
  totalGeneratedCount: number;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  wallet: TransactionWalletSummary;
  category: TransactionCategorySummary;
}

export interface RecurringGeneratedTransaction {
  id: string;
  scheduledForDate: string;
  generatedAt: string;
  status: RecurringTransactionOccurrenceStatus;
  errorMessage?: string | null;
  transaction: Transaction;
}

export interface RecurringTransactionDetail extends RecurringTransaction {
  recentGeneratedTransactions: RecurringGeneratedTransaction[];
}

export interface CalendarDaySummary {
  date: string;
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  recurringUpcomingCount: number;
  hasActivity: boolean;
}

export interface CalendarRecurringPreview {
  id: string;
  recurringTransactionId: string;
  walletId: string;
  categoryId: string;
  name: string;
  note?: string | null;
  type: TransactionType;
  amount: number;
  frequency: RecurringTransactionFrequency;
  interval: number;
  scheduledDate: string;
  status: RecurringTransactionStatus;
  wallet: TransactionWalletSummary;
  category: TransactionCategorySummary;
}

export interface CalendarSummary {
  startDate: string;
  endDate: string;
  days: CalendarDaySummary[];
}

export interface CalendarDayDetail {
  date: string;
  summary: CalendarDaySummary;
  transactions: Transaction[];
  upcomingRecurringTransactions: CalendarRecurringPreview[];
  pagination: PaginationMeta;
}

export type DebtType = "I_OWE" | "OWED_TO_ME";

export type DebtStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface Debt {
  id: string;
  userId: string;
  type: DebtType;
  title: string;
  personName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string | null;
  status: DebtStatus;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  paymentCount?: number;
}

export interface DebtPaymentTransactionSummary {
  id: string;
  walletId: string;
  categoryId: string;
  type: TransactionType;
  purpose: TransactionPurpose;
  amount: number;
  transactionDate: string;
  note?: string | null;
  wallet: TransactionWalletSummary;
  category: TransactionCategorySummary;
}

export interface DebtPayment {
  id: string;
  userId: string;
  debtId: string;
  transactionId: string;
  amount: number;
  paymentDate: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  transaction: DebtPaymentTransactionSummary;
}

export interface DebtDetail extends Debt {
  payments: DebtPayment[];
}

export interface DebtSummary {
  totalIOweRemainingAmount: number;
  totalOwedToMeRemainingAmount: number;
  unpaidDebtCount: number;
  partialDebtCount: number;
  paidDebtCount: number;
  dueSoonCount: number;
  overdueCount: number;
  recentPayments: DebtPayment[];
  upcomingDueDebts: Debt[];
}

export type SavingGoalStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface SavingGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  deadline?: string | null;
  status: SavingGoalStatus;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  contributionCount?: number;
}

export interface SavingContributionTransactionSummary {
  id: string;
  walletId: string;
  categoryId: string;
  type: TransactionType;
  purpose: TransactionPurpose;
  amount: number;
  transactionDate: string;
  note?: string | null;
  wallet: TransactionWalletSummary;
  category: TransactionCategorySummary;
}

export interface SavingContribution {
  id: string;
  userId: string;
  savingGoalId: string;
  transactionId: string;
  amount: number;
  contributionDate: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  transaction: SavingContributionTransactionSummary;
}

export interface SavingGoalDetail extends SavingGoal {
  contributions: SavingContribution[];
}

export interface SavingGoalSummary {
  totalTargetAmount: number;
  totalSavedAmount: number;
  totalRemainingAmount: number;
  averageProgressPercentage: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  cancelledGoalsCount: number;
  dueSoonCount: number;
  overdueCount: number;
  recentContributions: SavingContribution[];
  activeGoals: SavingGoal[];
}

export type BudgetStatus = "SAFE" | "WARNING" | "OVER_BUDGET";

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  month: number;
  year: number;
  limitAmount: number;
  createdAt: string;
  updatedAt: string;
  category: TransactionCategorySummary;
}

export interface BudgetSummaryItem extends Budget {
  usedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  overAmount: number;
  status: BudgetStatus;
}

export interface BudgetSummary {
  month: number;
  year: number;
  totalLimitAmount: number;
  totalUsedAmount: number;
  totalRemainingAmount: number;
  overallUsagePercentage: number;
  safeBudgetCount: number;
  warningBudgetCount: number;
  overBudgetCount: number;
  items: BudgetSummaryItem[];
}

export interface DashboardTopExpenseCategory {
  categoryId: string;
  categoryName: string;
  color?: string | null;
  icon?: string | null;
  totalAmount: number;
  percentage: number;
}

export interface DashboardMonthlyFlow {
  month: number;
  year: number;
  label: string;
  income: number;
  expense: number;
}

export interface DashboardExpenseCategory {
  categoryId: string;
  categoryName: string;
  color?: string | null;
  icon?: string | null;
  totalAmount: number;
  percentage: number;
}

export interface DashboardOverBudgetCategory {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  usedAmount: number;
  overAmount: number;
  usagePercentage: number;
}

export interface DashboardSummary {
  month: number;
  year: number;
  financialSummary: {
    totalIncome: number;
    totalExpense: number;
    normalExpense: number;
    debtPayments: number;
    debtCollections: number;
    savingContributions: number;
    availableBalance: number;
    netCashFlow: number;
  };
  budgetSummary: BudgetSummary;
  topExpenseCategory: DashboardTopExpenseCategory | null;
  recentTransactions: Transaction[];
  incomeVsExpense: DashboardMonthlyFlow[];
  expenseByCategory: DashboardExpenseCategory[];
  overBudgetCategories: DashboardOverBudgetCategory[];
}

export type FinancialHealthStatus = "not_enough_data" | "excellent" | "good" | "fair" | "needs_attention" | "critical";

export type FinancialHealthComponentKey =
  | "cashflow_health"
  | "savings_rate"
  | "budget_discipline"
  | "recurring_burden"
  | "spending_stability";

export type FinancialHealthInsightType = "positive" | "warning" | "critical" | "neutral";

export type FinancialHealthInsightSeverity = "low" | "medium" | "high";

export interface FinancialHealthPeriod {
  startDate: string;
  endDate: string;
}

export interface FinancialHealthComponent {
  key: FinancialHealthComponentKey;
  label: string;
  score: number | null;
  weight: number;
  available: boolean;
  explanation: string;
  values?: Record<string, number | string | null>;
}

export interface FinancialHealthInsight {
  id: string;
  type: FinancialHealthInsightType;
  severity: FinancialHealthInsightSeverity;
  title: string;
  description: string;
  action?: string;
  relatedMetricKey?: FinancialHealthComponentKey;
  categoryId?: string;
  categoryName?: string;
  supportingValues?: Record<string, number | string | null>;
}

export interface FinancialHealth {
  score: number;
  status: FinancialHealthStatus;
  summary: string;
  period: FinancialHealthPeriod;
  comparisonPeriod: FinancialHealthPeriod;
  components: FinancialHealthComponent[];
  insights: FinancialHealthInsight[];
  metadata: {
    calculatedAt: string;
    hasEnoughData: boolean;
    missingMetrics: FinancialHealthComponentKey[];
  };
}

export type ReportType = "monthly" | "range" | "transactions" | "budgets" | "debts" | "goals";

export type ExportFormat = "xlsx" | "csv";

export interface ReportPeriod {
  type: "monthly" | "range";
  month?: number;
  year?: number;
  label: string;
  startDate: string;
  endDate: string;
  endDateIsExclusive: boolean;
}

export interface ReportFinancialSummary {
  totalIncome: number;
  totalExpense: number;
  normalExpense: number;
  debtPayments: number;
  debtCollections: number;
  savingContributions: number;
  transactionCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  availableBalance?: number;
  netCashFlow: number;
}

export interface ReportCategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  icon?: string | null;
  color?: string | null;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface ReportTransaction extends Transaction {
  wallet: TransactionWalletSummary;
  category: TransactionCategorySummary;
}

export interface ReportDebtPaymentPeriodSummary {
  paymentCount: number;
  totalAmount: number;
}

export interface ReportSavingContributionPeriodSummary {
  contributionCount: number;
  totalAmount: number;
}

export interface MonthlyReport {
  period: ReportPeriod;
  financialSummary: ReportFinancialSummary & { availableBalance: number };
  expenseByCategory: ReportCategoryBreakdownItem[];
  incomeByCategory: ReportCategoryBreakdownItem[];
  budgetSummary: BudgetSummary;
  debtSummary: DebtSummary;
  savingGoalSummary: SavingGoalSummary;
  periodDebtPayments: ReportDebtPaymentPeriodSummary;
  periodSavingContributions: ReportSavingContributionPeriodSummary;
  debts: Debt[];
  savingGoals: SavingGoal[];
  transactions: ReportTransaction[];
  recentTransactions: ReportTransaction[];
}

export interface RangeReport {
  period: ReportPeriod;
  financialSummary: ReportFinancialSummary & { availableBalance: number };
  expenseByCategory: ReportCategoryBreakdownItem[];
  incomeByCategory: ReportCategoryBreakdownItem[];
  budgetSummaries: BudgetSummary[];
  debtSummary: DebtSummary;
  savingGoalSummary: SavingGoalSummary;
  periodDebtPayments: ReportDebtPaymentPeriodSummary;
  periodSavingContributions: ReportSavingContributionPeriodSummary;
  debts: Debt[];
  savingGoals: SavingGoal[];
  transactions: ReportTransaction[];
  recentTransactions: ReportTransaction[];
}

export interface TransactionReport {
  filters: Record<string, unknown>;
  financialSummary: ReportFinancialSummary;
  expenseByCategory: ReportCategoryBreakdownItem[];
  incomeByCategory: ReportCategoryBreakdownItem[];
  transactions: ReportTransaction[];
}

export interface BudgetReport {
  period: ReportPeriod;
  summary: BudgetSummary;
}

export interface DebtReportFilteredTotals {
  debtCount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  statusCounts: Record<DebtStatus, number>;
  typeCounts: Record<DebtType, number>;
}

export interface DebtReport {
  filters: Record<string, unknown>;
  summary: DebtSummary;
  filteredTotals: DebtReportFilteredTotals;
  debts: Debt[];
}

export interface SavingGoalReportFilteredTotals {
  goalCount: number;
  totalTargetAmount: number;
  totalSavedAmount: number;
  totalRemainingAmount: number;
  statusCounts: Record<SavingGoalStatus, number>;
  averageProgressPercentage: number;
}

export interface SavingGoalReport {
  filters: Record<string, unknown>;
  summary: SavingGoalSummary;
  filteredTotals: SavingGoalReportFilteredTotals;
  goals: SavingGoal[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorPayload {
  success?: false;
  message?: string;
  code?: string;
  errors?: Record<string, string[] | string> | null;
}
