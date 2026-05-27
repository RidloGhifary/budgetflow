CREATE TYPE "RecurringTransactionFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

CREATE TYPE "RecurringTransactionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

CREATE TYPE "RecurringTransactionOccurrenceStatus" AS ENUM ('GENERATED', 'FAILED');

ALTER TABLE "transactions"
  ADD COLUMN "recurringTransactionId" TEXT;

CREATE TABLE "recurring_transactions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "note" TEXT,
  "type" "TransactionType" NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "frequency" "RecurringTransactionFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "nextRunDate" TIMESTAMP(3),
  "lastRunDate" TIMESTAMP(3),
  "status" "RecurringTransactionStatus" NOT NULL DEFAULT 'ACTIVE',
  "autoGenerate" BOOLEAN NOT NULL DEFAULT true,
  "totalGeneratedCount" INTEGER NOT NULL DEFAULT 0,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recurring_transaction_occurrences" (
  "id" TEXT NOT NULL,
  "recurringTransactionId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "scheduledForDate" TIMESTAMP(3) NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "RecurringTransactionOccurrenceStatus" NOT NULL DEFAULT 'GENERATED',
  "errorMessage" TEXT,

  CONSTRAINT "recurring_transaction_occurrences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transactions_recurringTransactionId_idx" ON "transactions"("recurringTransactionId");
CREATE INDEX "recurring_transactions_userId_idx" ON "recurring_transactions"("userId");
CREATE INDEX "recurring_transactions_status_idx" ON "recurring_transactions"("status");
CREATE INDEX "recurring_transactions_nextRunDate_idx" ON "recurring_transactions"("nextRunDate");
CREATE INDEX "recurring_transactions_userId_status_idx" ON "recurring_transactions"("userId", "status");
CREATE INDEX "recurring_transactions_status_nextRunDate_idx" ON "recurring_transactions"("status", "nextRunDate");
CREATE INDEX "recurring_transactions_walletId_idx" ON "recurring_transactions"("walletId");
CREATE INDEX "recurring_transactions_categoryId_idx" ON "recurring_transactions"("categoryId");
CREATE UNIQUE INDEX "recurring_transaction_occurrences_transactionId_key" ON "recurring_transaction_occurrences"("transactionId");
CREATE UNIQUE INDEX "recurring_transaction_occurrences_recurringTransactionId_scheduledForDate_key" ON "recurring_transaction_occurrences"("recurringTransactionId", "scheduledForDate");
CREATE INDEX "recurring_transaction_occurrences_recurringTransactionId_idx" ON "recurring_transaction_occurrences"("recurringTransactionId");
CREATE INDEX "recurring_transaction_occurrences_scheduledForDate_idx" ON "recurring_transaction_occurrences"("scheduledForDate");

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_recurringTransactionId_fkey"
  FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recurring_transactions"
  ADD CONSTRAINT "recurring_transactions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_transactions"
  ADD CONSTRAINT "recurring_transactions_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_transactions"
  ADD CONSTRAINT "recurring_transactions_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_transaction_occurrences"
  ADD CONSTRAINT "recurring_transaction_occurrences_recurringTransactionId_fkey"
  FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_transaction_occurrences"
  ADD CONSTRAINT "recurring_transaction_occurrences_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
