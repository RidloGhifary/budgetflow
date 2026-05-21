CREATE TYPE "SavingGoalStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "saving_goals" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetAmount" DECIMAL(14, 2) NOT NULL,
  "currentAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "deadline" TIMESTAMP(3),
  "status" "SavingGoalStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "saving_goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saving_contributions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "savingGoalId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "contributionDate" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "saving_contributions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saving_goals_userId_status_idx" ON "saving_goals"("userId", "status");
CREATE INDEX "saving_goals_userId_deadline_idx" ON "saving_goals"("userId", "deadline");
CREATE UNIQUE INDEX "saving_contributions_transactionId_key" ON "saving_contributions"("transactionId");
CREATE INDEX "saving_contributions_userId_contributionDate_idx" ON "saving_contributions"("userId", "contributionDate");
CREATE INDEX "saving_contributions_savingGoalId_idx" ON "saving_contributions"("savingGoalId");

ALTER TABLE "saving_goals"
  ADD CONSTRAINT "saving_goals_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saving_contributions"
  ADD CONSTRAINT "saving_contributions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saving_contributions"
  ADD CONSTRAINT "saving_contributions_savingGoalId_fkey"
  FOREIGN KEY ("savingGoalId") REFERENCES "saving_goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "saving_contributions"
  ADD CONSTRAINT "saving_contributions_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
