-- AlterTable
ALTER TABLE "meeples" ADD COLUMN     "privateCollectionSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "private_game_collection_entries" ADD COLUMN     "forTrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "wantToPlay" BOOLEAN NOT NULL DEFAULT false;
