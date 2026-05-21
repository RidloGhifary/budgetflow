CREATE TYPE "WalletType" AS ENUM ('CASH', 'BANK', 'EWALLET', 'CREDIT_CARD', 'OTHER');

CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE "wallets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "WalletType" NOT NULL,
  "initialBalance" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "currentBalance" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "CategoryType" NOT NULL,
  "icon" TEXT,
  "color" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallets_userId_name_key" ON "wallets"("userId", "name");
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

CREATE UNIQUE INDEX "categories_userId_type_name_key" ON "categories"("userId", "type", "name");
CREATE INDEX "categories_userId_idx" ON "categories"("userId");

ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
