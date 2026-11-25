-- AlterTable
ALTER TABLE "meeples" ADD COLUMN     "shareForTrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareWantToPlay" BOOLEAN NOT NULL DEFAULT false;
