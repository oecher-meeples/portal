-- AlterTable: replace the self-book "uncertain" flag with an admin-assignment
-- confirmation timestamp. Existing rows start unconfirmed (NULL) — they
-- predate the confirm flow and have no meaningful confirmation state.
ALTER TABLE "shift_bookings" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "shift_bookings" DROP COLUMN "uncertain";
