-- AlterTable
ALTER TABLE "board_games" ADD COLUMN     "secondaryAlternateNameId" TEXT;

-- CreateTable
CREATE TABLE "board_game_alternate_names" (
    "id" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_game_alternate_names_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_game_alternate_names_boardGameId_idx" ON "board_game_alternate_names"("boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "board_games_secondaryAlternateNameId_key" ON "board_games"("secondaryAlternateNameId");

-- AddForeignKey
ALTER TABLE "board_games" ADD CONSTRAINT "board_games_secondaryAlternateNameId_fkey" FOREIGN KEY ("secondaryAlternateNameId") REFERENCES "board_game_alternate_names"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_game_alternate_names" ADD CONSTRAINT "board_game_alternate_names_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

