CREATE TYPE "AuditLogResult" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

CREATE TYPE "AuditLogSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "result" "AuditLogResult" NOT NULL DEFAULT 'SUCCESS',
  "severity" "AuditLogSeverity" NOT NULL DEFAULT 'INFO',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "browser" TEXT,
  "operatingSystem" TEXT,
  "deviceType" TEXT,
  "sessionId" TEXT,
  "requestId" TEXT,
  "correlationId" TEXT,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB,
  "metadata" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");
CREATE INDEX "audit_logs_result_idx" ON "audit_logs"("result");
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_userId_action_idx" ON "audit_logs"("userId", "action");
CREATE INDEX "audit_logs_userId_entityType_idx" ON "audit_logs"("userId", "entityType");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
