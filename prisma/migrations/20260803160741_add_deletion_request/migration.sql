-- CreateTable
CREATE TABLE "deletion_requests" (
    "id" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deletion_requests_meepleId_idx" ON "deletion_requests"("meepleId");

-- CreateIndex
CREATE INDEX "deletion_requests_handledAt_idx" ON "deletion_requests"("handledAt");

-- AddForeignKey
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
