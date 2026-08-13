-- AlterTable
ALTER TABLE "lfg_posts" ADD COLUMN     "boardGameId" TEXT;

-- CreateIndex
CREATE INDEX "lfg_posts_boardGameId_idx" ON "lfg_posts"("boardGameId");

-- AddForeignKey
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
