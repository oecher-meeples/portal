-- CreateEnum
CREATE TYPE "PrivateEventLoanStatus" AS ENUM ('OFFERED', 'LOANED', 'RETURNED');

-- CreateTable
CREATE TABLE "private_event_loans" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ownerMeepleId" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "status" "PrivateEventLoanStatus" NOT NULL DEFAULT 'OFFERED',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),
    "issuedByMeepleId" TEXT,
    "returnedAt" TIMESTAMP(3),

    CONSTRAINT "private_event_loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_event_loans_eventId_status_idx" ON "private_event_loans"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "private_event_loans_eventId_ownerMeepleId_boardGameId_key" ON "private_event_loans"("eventId", "ownerMeepleId", "boardGameId");

-- AddForeignKey
ALTER TABLE "private_event_loans" ADD CONSTRAINT "private_event_loans_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_event_loans" ADD CONSTRAINT "private_event_loans_ownerMeepleId_fkey" FOREIGN KEY ("ownerMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_event_loans" ADD CONSTRAINT "private_event_loans_issuedByMeepleId_fkey" FOREIGN KEY ("issuedByMeepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_event_loans" ADD CONSTRAINT "private_event_loans_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
