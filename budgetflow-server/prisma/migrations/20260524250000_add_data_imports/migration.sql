-- CreateEnum
CREATE TYPE "DataImportStatus" AS ENUM ('UPLOADED', 'PARSING', 'AWAITING_CONFIRMATION', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DataImportRowStatus" AS ENUM ('VALID', 'INVALID', 'DUPLICATE', 'IMPORTED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "DataImportFormat" AS ENUM ('CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "DataImportType" AS ENUM ('TRANSACTIONS');

-- CreateTable
CREATE TABLE "data_imports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "importType" "DataImportType" NOT NULL,
    "format" "DataImportFormat" NOT NULL,
    "status" "DataImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "mapping" JSONB,
    "options" JSONB,
    "summary" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_import_rows" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "validationStatus" "DataImportRowStatus" NOT NULL,
    "validationErrors" JSONB,
    "duplicateKey" TEXT,
    "matchedWalletId" TEXT,
    "matchedCategoryId" TEXT,
    "createdTransactionId" TEXT,
    "skippedReason" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_imports_userId_idx" ON "data_imports"("userId");

-- CreateIndex
CREATE INDEX "data_imports_status_idx" ON "data_imports"("status");

-- CreateIndex
CREATE INDEX "data_imports_importType_idx" ON "data_imports"("importType");

-- CreateIndex
CREATE INDEX "data_imports_userId_createdAt_idx" ON "data_imports"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "data_imports_userId_status_idx" ON "data_imports"("userId", "status");

-- CreateIndex
CREATE INDEX "data_imports_jobId_idx" ON "data_imports"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "data_import_rows_importId_rowNumber_key" ON "data_import_rows"("importId", "rowNumber");

-- CreateIndex
CREATE INDEX "data_import_rows_importId_idx" ON "data_import_rows"("importId");

-- CreateIndex
CREATE INDEX "data_import_rows_validationStatus_idx" ON "data_import_rows"("validationStatus");

-- CreateIndex
CREATE INDEX "data_import_rows_duplicateKey_idx" ON "data_import_rows"("duplicateKey");

-- CreateIndex
CREATE INDEX "data_import_rows_createdTransactionId_idx" ON "data_import_rows"("createdTransactionId");

-- CreateIndex
CREATE INDEX "data_import_rows_importId_validationStatus_idx" ON "data_import_rows"("importId", "validationStatus");

-- AddForeignKey
ALTER TABLE "data_imports" ADD CONSTRAINT "data_imports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_imports" ADD CONSTRAINT "data_imports_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "background_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_rows" ADD CONSTRAINT "data_import_rows_importId_fkey" FOREIGN KEY ("importId") REFERENCES "data_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
