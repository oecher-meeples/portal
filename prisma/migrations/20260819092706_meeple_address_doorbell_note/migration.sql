-- AlterTable
ALTER TABLE "board_games" ALTER COLUMN "publisher" DROP DEFAULT,
ALTER COLUMN "author" DROP DEFAULT;

-- AlterTable
ALTER TABLE "game_copies" ALTER COLUMN "ruleBookLanguages" DROP DEFAULT;

-- AlterTable
ALTER TABLE "meeples" ADD COLUMN     "address" TEXT,
ADD COLUMN     "doorbellNote" TEXT;
