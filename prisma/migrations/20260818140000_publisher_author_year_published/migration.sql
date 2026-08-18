-- AlterTable
ALTER TABLE "board_games" ADD COLUMN "publisher" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "board_games" ADD COLUMN "author" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "board_games" ADD COLUMN "yearPublished" INTEGER;
