CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TYPE "DataExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

CREATE TYPE "DataExportFormat" AS ENUM ('CSV');

CREATE TYPE "DataExportType" AS ENUM ('TRANSACTIONS');

CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "queueName" TEXT NOT NULL DEFAULT 'default',
    "payload" JSONB,
    "result" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_exports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "format" "DataExportFormat" NOT NULL,
    "status" "DataExportStatus" NOT NULL DEFAULT 'PENDING',
    "exportType" "DataExportType" NOT NULL,
    "filters" JSONB,
    "fileName" TEXT,
    "storageKey" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "rowCount" INTEGER,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "background_jobs_status_idx" ON "background_jobs"("status");
CREATE INDEX "background_jobs_type_idx" ON "background_jobs"("type");
CREATE INDEX "background_jobs_runAt_idx" ON "background_jobs"("runAt");
CREATE INDEX "background_jobs_status_runAt_idx" ON "background_jobs"("status", "runAt");
CREATE INDEX "background_jobs_lockedAt_idx" ON "background_jobs"("lockedAt");
CREATE INDEX "background_jobs_createdByUserId_idx" ON "background_jobs"("createdByUserId");
CREATE INDEX "background_jobs_createdAt_idx" ON "background_jobs"("createdAt");

CREATE INDEX "data_exports_userId_idx" ON "data_exports"("userId");
CREATE INDEX "data_exports_status_idx" ON "data_exports"("status");
CREATE INDEX "data_exports_userId_createdAt_idx" ON "data_exports"("userId", "createdAt");
CREATE INDEX "data_exports_userId_status_idx" ON "data_exports"("userId", "status");
CREATE INDEX "data_exports_jobId_idx" ON "data_exports"("jobId");
CREATE INDEX "data_exports_expiresAt_idx" ON "data_exports"("expiresAt");

ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "background_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
