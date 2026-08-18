-- AlterTable
ALTER TABLE "board_games" ADD COLUMN "secondaryTitle" TEXT;

-- Backfill from the BoardGameAlternateName mechanism it replaces (#203) — must
-- run before the column/constraint below are dropped.
UPDATE "board_games" bg
SET "secondaryTitle" = ban."name"
FROM "board_game_alternate_names" ban
WHERE ban."id" = bg."secondaryAlternateNameId";

-- DropForeignKey
ALTER TABLE "board_games" DROP CONSTRAINT "board_games_secondaryAlternateNameId_fkey";

-- DropIndex
DROP INDEX "board_games_secondaryAlternateNameId_key";

-- AlterTable
ALTER TABLE "board_games" DROP COLUMN "secondaryAlternateNameId";
