-- CreateEnum
CREATE TYPE "GameInventoryStatus" AS ENUM ('ACTIVE', 'DEINVENTARISED');

-- CreateTable
CREATE TABLE "board_games" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bggId" INTEGER,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playTimeMinutes" INTEGER,
    "weight" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "description" TEXT,
    "mechanics" TEXT[],
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "condition" TEXT,
    "status" "GameInventoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "archivedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_games_slug_key" ON "board_games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "board_games_bggId_key" ON "board_games"("bggId");
