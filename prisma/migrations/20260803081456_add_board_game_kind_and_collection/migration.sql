-- CreateEnum
CREATE TYPE "BoardGameKind" AS ENUM ('BOARDGAME', 'BOARDGAME_EXPANSION');

-- AlterTable
ALTER TABLE "board_games" ADD COLUMN     "kind" "BoardGameKind" NOT NULL DEFAULT 'BOARDGAME';

-- CreateTable
CREATE TABLE "game_collections" (
    "baseGameId" TEXT NOT NULL,
    "expansionId" TEXT NOT NULL,

    CONSTRAINT "game_collections_pkey" PRIMARY KEY ("baseGameId","expansionId")
);

-- AddForeignKey
ALTER TABLE "game_collections" ADD CONSTRAINT "game_collections_baseGameId_fkey" FOREIGN KEY ("baseGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_collections" ADD CONSTRAINT "game_collections_expansionId_fkey" FOREIGN KEY ("expansionId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
