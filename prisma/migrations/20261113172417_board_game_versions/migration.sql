-- AlterTable
ALTER TABLE "game_copies" ADD COLUMN     "versionId" TEXT;

-- AlterTable
ALTER TABLE "private_game_collection_entries" ADD COLUMN     "versionId" TEXT;

-- CreateTable
CREATE TABLE "board_game_versions" (
    "id" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "bggVersionId" INTEGER,
    "name" TEXT,
    "yearPublished" INTEGER,
    "productCode" TEXT,
    "languages" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_game_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_game_version_publishers" (
    "versionId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,

    CONSTRAINT "board_game_version_publishers_pkey" PRIMARY KEY ("versionId","contributorId")
);

-- CreateIndex
CREATE INDEX "board_game_versions_boardGameId_idx" ON "board_game_versions"("boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "board_game_versions_boardGameId_bggVersionId_key" ON "board_game_versions"("boardGameId", "bggVersionId");

-- CreateIndex
CREATE INDEX "board_game_version_publishers_contributorId_idx" ON "board_game_version_publishers"("contributorId");

-- CreateIndex
CREATE INDEX "game_copies_versionId_idx" ON "game_copies"("versionId");

-- AddForeignKey
ALTER TABLE "board_game_versions" ADD CONSTRAINT "board_game_versions_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_game_version_publishers" ADD CONSTRAINT "board_game_version_publishers_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "board_game_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_game_version_publishers" ADD CONSTRAINT "board_game_version_publishers_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_copies" ADD CONSTRAINT "game_copies_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "board_game_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_game_collection_entries" ADD CONSTRAINT "private_game_collection_entries_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "board_game_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verlage hängen jetzt an der Edition (BoardGameVersionPublisher), nicht mehr am Titel.
DELETE FROM "board_game_contributors" WHERE "role" = 'PUBLISHER';
