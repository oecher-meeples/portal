-- CreateEnum
CREATE TYPE "HelperPhase" AS ENUM ('PLANNING', 'SEEKING', 'CONFIRMATION_REQUESTED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "helperPhase" "HelperPhase" NOT NULL DEFAULT 'PLANNING';

-- Bestehende "Helfer suchen"-Events behalten ihre Freigabe
UPDATE "events" SET "helperPhase" = 'SEEKING' WHERE "helpersWanted" = true;

ALTER TABLE "events" DROP COLUMN "helpersWanted";
