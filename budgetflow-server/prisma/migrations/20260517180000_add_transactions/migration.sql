CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

CREATE TYPE "TransactionPurpose" AS ENUM ('NORMAL', 'DEBT_PAYMENT', 'DEBT_COLLECTION', 'SAVING_CONTRIBUTION');

CREATE TABLE "transactions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "purpose" "TransactionPurpose" NOT NULL DEFAULT 'NORMAL',
  "amount" DECIMAL(14, 2) NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transactions_userId_transactionDate_idx" ON "transactions"("userId", "transactionDate");
CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");
CREATE INDEX "transactions_categoryId_idx" ON "transactions"("categoryId");

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
