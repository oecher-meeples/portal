-- CreateEnum
CREATE TYPE "FleaMarketItemStatus" AS ENUM ('PENDING', 'FOR_SALE', 'RESERVED', 'SOLD');

-- CreateTable
CREATE TABLE "flea_market_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sellerMeepleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceEuros" INTEGER NOT NULL,
    "status" "FleaMarketItemStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedByMeepleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flea_market_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flea_market_items_code_key" ON "flea_market_items"("code");

-- CreateIndex
CREATE INDEX "flea_market_items_eventId_idx" ON "flea_market_items"("eventId");

-- CreateIndex
CREATE INDEX "flea_market_items_sellerMeepleId_idx" ON "flea_market_items"("sellerMeepleId");

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_sellerMeepleId_fkey" FOREIGN KEY ("sellerMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
