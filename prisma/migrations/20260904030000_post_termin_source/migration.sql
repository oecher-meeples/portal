-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "sourceIcsUid" TEXT,
ADD COLUMN     "sourceEventId" TEXT,
ADD COLUMN     "syncedTitle" TEXT,
ADD COLUMN     "syncedLocationNote" TEXT,
ADD COLUMN     "syncedStartsAt" TIMESTAMP(3),
ADD COLUMN     "syncedEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "posts_sourceIcsUid_key" ON "posts"("sourceIcsUid");

-- CreateIndex
CREATE UNIQUE INDEX "posts_sourceEventId_key" ON "posts"("sourceEventId");
