-- DropForeignKey
ALTER TABLE "game_holdings" DROP CONSTRAINT "game_holdings_vereinsmitgliedId_fkey";

-- AddForeignKey
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_vereinsmitgliedId_fkey" FOREIGN KEY ("vereinsmitgliedId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
