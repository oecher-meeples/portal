-- CreateEnum
CREATE TYPE "ExplainerExperienceLevel" AS ENUM ('WITH_MANUAL', 'WITHOUT_MANUAL', 'BY_HEART');

-- AlterTable
ALTER TABLE "board_games" ADD COLUMN     "explainerVideoUrl" TEXT;

-- CreateTable
CREATE TABLE "explainer_games" (
    "id" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "level" "ExplainerExperienceLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "explainer_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "explainer_attendances" (
    "eventId" TEXT NOT NULL,
    "meepleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "explainer_attendances_pkey" PRIMARY KEY ("eventId","meepleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "explainer_games_meepleId_boardGameId_key" ON "explainer_games"("meepleId", "boardGameId");

-- AddForeignKey
ALTER TABLE "explainer_games" ADD CONSTRAINT "explainer_games_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explainer_games" ADD CONSTRAINT "explainer_games_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explainer_attendances" ADD CONSTRAINT "explainer_attendances_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explainer_attendances" ADD CONSTRAINT "explainer_attendances_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
