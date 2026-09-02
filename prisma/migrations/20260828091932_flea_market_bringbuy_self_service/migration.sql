-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FleaMarketItemStatus" ADD VALUE 'PAID_OUT';
ALTER TYPE "FleaMarketItemStatus" ADD VALUE 'RETURNED';
ALTER TYPE "FleaMarketItemStatus" ADD VALUE 'DONATED';

-- AlterTable
ALTER TABLE "flea_market_items" ADD COLUMN     "cartId" TEXT,
ADD COLUMN     "externalSellerId" TEXT,
ADD COLUMN     "language" TEXT,
ALTER COLUMN "sellerMeepleId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "flea_market_external_sellers" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flea_market_external_sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flea_market_carts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flea_market_carts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flea_market_external_sellers_token_key" ON "flea_market_external_sellers"("token");

-- CreateIndex
CREATE INDEX "flea_market_external_sellers_eventId_idx" ON "flea_market_external_sellers"("eventId");

-- CreateIndex
CREATE INDEX "flea_market_carts_eventId_idx" ON "flea_market_carts"("eventId");

-- CreateIndex
CREATE INDEX "flea_market_items_externalSellerId_idx" ON "flea_market_items"("externalSellerId");

-- CreateIndex
CREATE INDEX "flea_market_items_cartId_idx" ON "flea_market_items"("cartId");

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_externalSellerId_fkey" FOREIGN KEY ("externalSellerId") REFERENCES "flea_market_external_sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_items" ADD CONSTRAINT "flea_market_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "flea_market_carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_external_sellers" ADD CONSTRAINT "flea_market_external_sellers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flea_market_carts" ADD CONSTRAINT "flea_market_carts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
