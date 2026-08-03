-- CreateTable
CREATE TABLE "spare_part_listings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "boardGameId" TEXT,
    "condition" TEXT NOT NULL,
    "description" TEXT,
    "keeperMeepleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spare_part_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spare_part_listings_boardGameId_idx" ON "spare_part_listings"("boardGameId");

-- CreateIndex
CREATE INDEX "spare_part_listings_keeperMeepleId_idx" ON "spare_part_listings"("keeperMeepleId");

-- AddForeignKey
ALTER TABLE "spare_part_listings" ADD CONSTRAINT "spare_part_listings_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_part_listings" ADD CONSTRAINT "spare_part_listings_keeperMeepleId_fkey" FOREIGN KEY ("keeperMeepleId") REFERENCES "meeples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
