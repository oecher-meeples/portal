-- DropForeignKey
ALTER TABLE "game_holdings" DROP CONSTRAINT "game_holdings_boardGameId_fkey";

-- DropIndex
DROP INDEX "board_games_bggId_idx";

-- DropIndex
DROP INDEX "board_games_slug_key";

-- DropIndex
DROP INDEX "board_games_status_idx";

-- DropIndex
DROP INDEX "game_holdings_boardGameId_endedAt_idx";

-- DropIndex
DROP INDEX "private_game_collection_entries_meepleId_bggId_key";

-- AlterTable
ALTER TABLE "board_games" DROP COLUMN "archivedAt",
DROP COLUMN "archivedReason",
DROP COLUMN "condition",
DROP COLUMN "lastCheckedAt",
DROP COLUMN "location",
DROP COLUMN "needsCompletenessCheck",
DROP COLUMN "quantity",
DROP COLUMN "slug",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "game_holdings" DROP COLUMN "boardGameId",
ADD COLUMN     "gameCopyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "private_game_collection_entries" DROP COLUMN "bggId",
DROP COLUMN "imageUrl",
DROP COLUMN "maxPlayers",
DROP COLUMN "minPlayers",
DROP COLUMN "playTimeMinutes",
DROP COLUMN "title",
ADD COLUMN     "boardGameId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "game_copies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "condition" TEXT,
    "needsCompletenessCheck" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "status" "GameInventoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "archivedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_copies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_copies_slug_key" ON "game_copies"("slug");

-- CreateIndex
CREATE INDEX "game_copies_boardGameId_idx" ON "game_copies"("boardGameId");

-- CreateIndex
CREATE INDEX "game_copies_status_idx" ON "game_copies"("status");

-- CreateIndex
CREATE UNIQUE INDEX "board_games_bggId_key" ON "board_games"("bggId");

-- CreateIndex
CREATE INDEX "game_holdings_gameCopyId_endedAt_idx" ON "game_holdings"("gameCopyId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "private_game_collection_entries_meepleId_boardGameId_key" ON "private_game_collection_entries"("meepleId", "boardGameId");

-- AddForeignKey
ALTER TABLE "game_copies" ADD CONSTRAINT "game_copies_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_game_collection_entries" ADD CONSTRAINT "private_game_collection_entries_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_gameCopyId_fkey" FOREIGN KEY ("gameCopyId") REFERENCES "game_copies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

