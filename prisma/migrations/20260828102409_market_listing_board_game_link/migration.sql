-- AlterTable
ALTER TABLE "market_listings" ADD COLUMN     "boardGameId" TEXT;

-- CreateIndex
CREATE INDEX "market_listings_boardGameId_idx" ON "market_listings"("boardGameId");

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
