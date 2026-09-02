-- AlterTable
ALTER TABLE "game_copies" ADD COLUMN     "inventoryNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "game_copies_inventoryNumber_key" ON "game_copies"("inventoryNumber");
