-- DropIndex
DROP INDEX "game_holdings_boardGameId_idx";

-- CreateIndex
CREATE INDEX "board_games_status_idx" ON "board_games"("status");

-- CreateIndex
CREATE INDEX "game_holdings_boardGameId_endedAt_idx" ON "game_holdings"("boardGameId", "endedAt");

-- CreateIndex
CREATE INDEX "posts_type_internal_date_idx" ON "posts"("type", "internal", "date");
