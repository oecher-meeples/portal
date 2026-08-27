-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'DRAFT');

-- AlterTable: every event, existing or new, defaults to DRAFT — visible only
-- to events:manage until an admin explicitly promotes it.
ALTER TABLE "events" ADD COLUMN "visibility" "EventVisibility" NOT NULL DEFAULT 'DRAFT';
