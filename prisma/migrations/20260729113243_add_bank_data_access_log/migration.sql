-- CreateEnum
CREATE TYPE "BankDataAccessKind" AS ENUM ('SINGLE_REVEAL', 'CSV_EXPORT');

-- CreateTable
CREATE TABLE "bank_data_access_logs" (
    "id" TEXT NOT NULL,
    "accessedByMeepleId" TEXT NOT NULL,
    "subjectMeepleId" TEXT,
    "kind" "BankDataAccessKind" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_data_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_data_access_logs_at_idx" ON "bank_data_access_logs"("at");

-- CreateIndex
CREATE INDEX "bank_data_access_logs_subjectMeepleId_idx" ON "bank_data_access_logs"("subjectMeepleId");

-- AddForeignKey
ALTER TABLE "bank_data_access_logs" ADD CONSTRAINT "bank_data_access_logs_accessedByMeepleId_fkey" FOREIGN KEY ("accessedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_data_access_logs" ADD CONSTRAINT "bank_data_access_logs_subjectMeepleId_fkey" FOREIGN KEY ("subjectMeepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;
