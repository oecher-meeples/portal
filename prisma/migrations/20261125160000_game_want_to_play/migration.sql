-- CreateTable
CREATE TABLE "game_want_to_play" (
    "id" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_want_to_play_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_want_to_play_boardGameId_idx" ON "game_want_to_play"("boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "game_want_to_play_meepleId_boardGameId_key" ON "game_want_to_play"("meepleId", "boardGameId");

-- AddForeignKey
ALTER TABLE "game_want_to_play" ADD CONSTRAINT "game_want_to_play_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_want_to_play" ADD CONSTRAINT "game_want_to_play_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
