-- CreateTable
CREATE TABLE "private_game_collection_entries" (
    "id" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "bggId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playTimeMinutes" INTEGER,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_game_collection_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_game_collection_entries_meepleId_idx" ON "private_game_collection_entries"("meepleId");

-- CreateIndex
CREATE UNIQUE INDEX "private_game_collection_entries_meepleId_bggId_key" ON "private_game_collection_entries"("meepleId", "bggId");

-- AddForeignKey
ALTER TABLE "private_game_collection_entries" ADD CONSTRAINT "private_game_collection_entries_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
