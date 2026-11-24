-- #599: Kontroll-Historie pro Exemplar. Nur DDL, keine Datenmigration.
-- CreateEnum
CREATE TYPE "GameCopyCheckResult" AS ENUM ('COMPLETE', 'INCOMPLETE', 'UNPLAYABLE', 'DAMAGED');

-- CreateTable
CREATE TABLE "game_copy_checks" (
    "id" TEXT NOT NULL,
    "gameCopyId" TEXT NOT NULL,
    "checkedByMeepleId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "GameCopyCheckResult" NOT NULL,
    "note" TEXT,

    CONSTRAINT "game_copy_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_copy_checks_gameCopyId_checkedAt_idx" ON "game_copy_checks"("gameCopyId", "checkedAt");

-- CreateIndex
CREATE INDEX "game_copy_checks_checkedAt_idx" ON "game_copy_checks"("checkedAt");

-- CreateIndex
CREATE INDEX "game_copy_checks_checkedByMeepleId_idx" ON "game_copy_checks"("checkedByMeepleId");

-- AddForeignKey
ALTER TABLE "game_copy_checks" ADD CONSTRAINT "game_copy_checks_gameCopyId_fkey" FOREIGN KEY ("gameCopyId") REFERENCES "game_copies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_copy_checks" ADD CONSTRAINT "game_copy_checks_checkedByMeepleId_fkey" FOREIGN KEY ("checkedByMeepleId") REFERENCES "meeples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

