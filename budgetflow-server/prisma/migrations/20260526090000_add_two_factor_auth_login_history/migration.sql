ALTER TABLE "users"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorSecret" TEXT,
  ADD COLUMN "twoFactorPendingSecret" TEXT,
  ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3),
  ADD COLUMN "twoFactorLastVerifiedAt" TIMESTAMP(3);

CREATE TABLE "two_factor_recovery_codes" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "two_factor_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "two_factor_challenges" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "two_factor_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "login_history" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "attemptedEmail" TEXT,
  "status" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "failureReason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "browser" TEXT,
  "operatingSystem" TEXT,
  "deviceType" TEXT,
  "sessionId" TEXT,
  "twoFactorRequired" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorPassed" BOOLEAN NOT NULL DEFAULT false,
  "recoveryCodeUsed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "two_factor_recovery_codes_userId_idx" ON "two_factor_recovery_codes"("userId");
CREATE INDEX "two_factor_recovery_codes_userId_usedAt_idx" ON "two_factor_recovery_codes"("userId", "usedAt");

CREATE INDEX "two_factor_challenges_userId_idx" ON "two_factor_challenges"("userId");
CREATE INDEX "two_factor_challenges_expiresAt_idx" ON "two_factor_challenges"("expiresAt");
CREATE INDEX "two_factor_challenges_userId_usedAt_idx" ON "two_factor_challenges"("userId", "usedAt");

CREATE INDEX "login_history_userId_idx" ON "login_history"("userId");
CREATE INDEX "login_history_userId_createdAt_idx" ON "login_history"("userId", "createdAt");
CREATE INDEX "login_history_attemptedEmail_createdAt_idx" ON "login_history"("attemptedEmail", "createdAt");
CREATE INDEX "login_history_status_idx" ON "login_history"("status");
CREATE INDEX "login_history_method_idx" ON "login_history"("method");

ALTER TABLE "two_factor_recovery_codes"
  ADD CONSTRAINT "two_factor_recovery_codes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "two_factor_challenges"
  ADD CONSTRAINT "two_factor_challenges_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "login_history"
  ADD CONSTRAINT "login_history_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
