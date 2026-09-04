-- AlterTable
ALTER TABLE "members" ADD COLUMN     "calendarTokenHash" TEXT,
ADD COLUMN     "calendarTokenCreatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "members_calendarTokenHash_key" ON "members"("calendarTokenHash");
