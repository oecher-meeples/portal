-- CreateEnum
CREATE TYPE "StorageUnitKind" AS ENUM ('BOX', 'SHELF');

-- CreateEnum
CREATE TYPE "HoldingOrigin" AS ENUM ('INITIAL', 'LOAN', 'RETURN', 'HANDOVER', 'RELOCATION');

-- AlterEnum
ALTER TYPE "GameInventoryStatus" ADD VALUE 'MAINTENANCE';

-- DropIndex
DROP INDEX "board_games_bggId_key";

-- AlterTable
ALTER TABLE "board_games" ADD COLUMN     "ean" TEXT,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "needsCompletenessCheck" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "storage_units" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "StorageUnitKind" NOT NULL,
    "label" TEXT NOT NULL,
    "parentUnitId" TEXT,
    "keeperMeepleId" TEXT,
    "locationNote" TEXT,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_unit_moves" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "keeperMeepleId" TEXT,
    "parentUnitId" TEXT,
    "locationNote" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "recordedByMeepleId" TEXT NOT NULL,

    CONSTRAINT "storage_unit_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_holdings" (
    "id" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "unitId" TEXT,
    "meepleId" TEXT,
    "origin" "HoldingOrigin" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "recordedByMeepleId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "game_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storage_units_code_key" ON "storage_units"("code");

-- CreateIndex
CREATE INDEX "storage_units_parentUnitId_idx" ON "storage_units"("parentUnitId");

-- CreateIndex
CREATE INDEX "storage_units_keeperMeepleId_idx" ON "storage_units"("keeperMeepleId");

-- CreateIndex
CREATE INDEX "storage_unit_moves_unitId_idx" ON "storage_unit_moves"("unitId");

-- CreateIndex
CREATE INDEX "game_holdings_boardGameId_idx" ON "game_holdings"("boardGameId");

-- CreateIndex
CREATE INDEX "game_holdings_unitId_idx" ON "game_holdings"("unitId");

-- CreateIndex
CREATE INDEX "game_holdings_meepleId_idx" ON "game_holdings"("meepleId");

-- CreateIndex
CREATE INDEX "board_games_bggId_idx" ON "board_games"("bggId");

-- CreateIndex
CREATE INDEX "board_games_ean_idx" ON "board_games"("ean");

-- AddForeignKey
ALTER TABLE "storage_units" ADD CONSTRAINT "storage_units_parentUnitId_fkey" FOREIGN KEY ("parentUnitId") REFERENCES "storage_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_units" ADD CONSTRAINT "storage_units_keeperMeepleId_fkey" FOREIGN KEY ("keeperMeepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_unit_moves" ADD CONSTRAINT "storage_unit_moves_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "storage_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_unit_moves" ADD CONSTRAINT "storage_unit_moves_keeperMeepleId_fkey" FOREIGN KEY ("keeperMeepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_unit_moves" ADD CONSTRAINT "storage_unit_moves_recordedByMeepleId_fkey" FOREIGN KEY ("recordedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "storage_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_recordedByMeepleId_fkey" FOREIGN KEY ("recordedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written safety net of the whole holding model (see docs/adr/0001). Prisma cannot
-- express either of these; do not drop them to make a later migration easier.

-- Exactly one open holding per game.
CREATE UNIQUE INDEX "game_holdings_open_unique" ON "game_holdings"("boardGameId") WHERE "endedAt" IS NULL;

-- Exactly one target: a storage unit or a meeple, never both and never neither.
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_single_target" CHECK (
  ("unitId" IS NOT NULL AND "meepleId" IS NULL)
  OR ("unitId" IS NULL AND "meepleId" IS NOT NULL)
);
