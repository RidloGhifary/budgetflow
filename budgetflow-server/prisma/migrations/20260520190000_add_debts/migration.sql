CREATE TYPE "DebtType" AS ENUM ('I_OWE', 'OWED_TO_ME');

CREATE TYPE "DebtStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

CREATE TABLE "debts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "DebtType" NOT NULL,
  "title" TEXT NOT NULL,
  "personName" TEXT NOT NULL,
  "totalAmount" DECIMAL(14, 2) NOT NULL,
  "paidAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "remainingAmount" DECIMAL(14, 2) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" "DebtStatus" NOT NULL DEFAULT 'UNPAID',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "debt_payments" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "debtId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "debt_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "debts_userId_type_idx" ON "debts"("userId", "type");
CREATE INDEX "debts_userId_status_idx" ON "debts"("userId", "status");
CREATE INDEX "debts_userId_dueDate_idx" ON "debts"("userId", "dueDate");
CREATE UNIQUE INDEX "debt_payments_transactionId_key" ON "debt_payments"("transactionId");
CREATE INDEX "debt_payments_userId_paymentDate_idx" ON "debt_payments"("userId", "paymentDate");
CREATE INDEX "debt_payments_debtId_idx" ON "debt_payments"("debtId");

ALTER TABLE "debts"
  ADD CONSTRAINT "debts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "debt_payments"
  ADD CONSTRAINT "debt_payments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "debt_payments"
  ADD CONSTRAINT "debt_payments_debtId_fkey"
  FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "debt_payments"
  ADD CONSTRAINT "debt_payments_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
