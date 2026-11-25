-- CreateEnum
CREATE TYPE "PrivateCollectionImportStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "private_collection_import_jobs" (
    "id" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "status" "PrivateCollectionImportStatus" NOT NULL DEFAULT 'PENDING',
    "importedCount" INTEGER,
    "error" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "private_collection_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_collection_import_jobs_status_requestedAt_idx" ON "private_collection_import_jobs"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "private_collection_import_jobs_meepleId_requestedAt_idx" ON "private_collection_import_jobs"("meepleId", "requestedAt");

-- AddForeignKey
ALTER TABLE "private_collection_import_jobs" ADD CONSTRAINT "private_collection_import_jobs_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
