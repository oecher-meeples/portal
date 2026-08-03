-- CreateTable
CREATE TABLE "market_listings" (
    "id" TEXT NOT NULL,
    "sellerMeepleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceEuros" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_listings_sellerMeepleId_idx" ON "market_listings"("sellerMeepleId");

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_sellerMeepleId_fkey" FOREIGN KEY ("sellerMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
