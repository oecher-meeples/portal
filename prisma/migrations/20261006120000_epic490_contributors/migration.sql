-- CreateEnum
CREATE TYPE "ContributorRole" AS ENUM ('PUBLISHER', 'AUTHOR', 'ILLUSTRATOR');

-- CreateTable
CREATE TABLE "contributors" (
    "id" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "bggId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_game_contributors" (
    "boardGameId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "role" "ContributorRole" NOT NULL,

    CONSTRAINT "board_game_contributors_pkey" PRIMARY KEY ("boardGameId","contributorId","role")
);

-- CreateIndex
CREATE UNIQUE INDEX "contributors_dedupKey_key" ON "contributors"("dedupKey");

-- CreateIndex
CREATE INDEX "contributors_bggId_idx" ON "contributors"("bggId");

-- CreateIndex
CREATE INDEX "board_game_contributors_contributorId_idx" ON "board_game_contributors"("contributorId");

-- AddForeignKey
ALTER TABLE "board_game_contributors" ADD CONSTRAINT "board_game_contributors_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_game_contributors" ADD CONSTRAINT "board_game_contributors_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

