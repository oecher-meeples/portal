-- AlterTable: drop old composite PK, add new columns as nullable first
ALTER TABLE "lfg_participants" DROP CONSTRAINT "lfg_participants_pkey",
ADD COLUMN     "id" TEXT,
ADD COLUMN     "addedByMeepleId" TEXT;

-- Backfill existing rows (#145): every pre-existing participant added themselves
UPDATE "lfg_participants" SET "id" = gen_random_uuid()::text, "addedByMeepleId" = "meepleId";

-- Now that every row has a value, make the columns required and set the new PK
ALTER TABLE "lfg_participants"
ALTER COLUMN "id" SET NOT NULL,
ALTER COLUMN "addedByMeepleId" SET NOT NULL,
ALTER COLUMN "meepleId" DROP NOT NULL,
ADD CONSTRAINT "lfg_participants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "lfg_posts" ADD COLUMN     "guestsMayBringGuests" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "lfg_participants_postId_idx" ON "lfg_participants"("postId");

-- CreateIndex
CREATE INDEX "lfg_participants_meepleId_idx" ON "lfg_participants"("meepleId");

-- CreateIndex
CREATE INDEX "lfg_participants_addedByMeepleId_idx" ON "lfg_participants"("addedByMeepleId");

-- CreateIndex
CREATE UNIQUE INDEX "lfg_participants_postId_meepleId_key" ON "lfg_participants"("postId", "meepleId");

-- AddForeignKey
ALTER TABLE "lfg_participants" ADD CONSTRAINT "lfg_participants_addedByMeepleId_fkey" FOREIGN KEY ("addedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
