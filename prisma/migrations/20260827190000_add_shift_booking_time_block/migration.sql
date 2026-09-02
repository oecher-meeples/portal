-- AlterTable: add the booking's own time block (#159), backfilled from the
-- containing Shift's target period for any pre-existing rows (created via
-- the self-book flow, before the Schichtplan-Editor existed).
ALTER TABLE "shift_bookings" ADD COLUMN "startsAt" TIMESTAMP(3);
ALTER TABLE "shift_bookings" ADD COLUMN "endsAt" TIMESTAMP(3);

UPDATE "shift_bookings" sb
SET "startsAt" = s."targetStartsAt",
    "endsAt" = s."targetEndsAt"
FROM "shifts" s
WHERE s.id = sb."shiftId";

ALTER TABLE "shift_bookings" ALTER COLUMN "startsAt" SET NOT NULL;
ALTER TABLE "shift_bookings" ALTER COLUMN "endsAt" SET NOT NULL;
