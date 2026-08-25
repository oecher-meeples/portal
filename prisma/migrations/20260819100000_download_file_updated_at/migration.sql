-- AlterTable
-- `fileUpdatedAt` must never be null. Existing rows have no recorded file
-- change, so they all get today's date via the column default rather than
-- a backfilled (and misleading) `updatedAt` value.
ALTER TABLE "downloads" ADD COLUMN "fileUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
