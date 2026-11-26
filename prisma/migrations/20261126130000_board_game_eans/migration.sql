-- CreateTable
CREATE TABLE "board_game_eans" (
    "id" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "ean" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_game_eans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_game_eans_ean_key" ON "board_game_eans"("ean");

-- CreateIndex
CREATE INDEX "board_game_eans_boardGameId_idx" ON "board_game_eans"("boardGameId");

-- AddForeignKey
ALTER TABLE "board_game_eans" ADD CONSTRAINT "board_game_eans_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration (#668): no ON CONFLICT — a duplicate EAN across titles fails the migration loudly.
INSERT INTO "board_game_eans" ("id", "boardGameId", "ean", "createdAt")
SELECT gen_random_uuid()::text, "id", regexp_replace("ean", '[\s-]', '', 'g'), now()
FROM "board_games"
WHERE "ean" IS NOT NULL AND btrim("ean") <> '';

-- DropIndex
DROP INDEX "board_games_ean_idx";

-- AlterTable
ALTER TABLE "board_games" DROP COLUMN "ean";
