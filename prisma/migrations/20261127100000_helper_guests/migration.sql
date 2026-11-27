-- #698 Helfer-Gäste: Personen ohne Account als Helfer (Verfügbarkeit + Buchung).

CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guests_nameKey_key" ON "guests"("nameKey");

ALTER TABLE "helper_availabilities" ALTER COLUMN "meepleId" DROP NOT NULL;
ALTER TABLE "helper_availabilities" ADD COLUMN "guestId" TEXT;
CREATE UNIQUE INDEX "helper_availabilities_guestId_dayId_key" ON "helper_availabilities"("guestId", "dayId");
ALTER TABLE "helper_availabilities" ADD CONSTRAINT "helper_availabilities_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift_bookings" ALTER COLUMN "meepleId" DROP NOT NULL;
ALTER TABLE "shift_bookings" ADD COLUMN "guestId" TEXT;
CREATE INDEX "shift_bookings_shiftId_guestId_idx" ON "shift_bookings"("shiftId", "guestId");
ALTER TABLE "shift_bookings" ADD CONSTRAINT "shift_bookings_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
