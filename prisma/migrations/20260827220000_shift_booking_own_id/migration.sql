-- Ein Meeple kann künftig mehrfach in derselben Schicht eingetragen sein
-- (unterschiedliche, nicht überlappende Zeitblöcke — z. B. Pausenablösung
-- durch dieselbe Person). Ersetzt den bisherigen Compound-PK (shiftId,
-- meepleId) durch eine eigene id.

ALTER TABLE "shift_bookings" DROP CONSTRAINT "shift_bookings_pkey";

ALTER TABLE "shift_bookings" ADD COLUMN "id" TEXT;
UPDATE "shift_bookings" SET "id" = md5(random()::text || clock_timestamp()::text) WHERE "id" IS NULL;
ALTER TABLE "shift_bookings" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "shift_bookings" ADD CONSTRAINT "shift_bookings_pkey" PRIMARY KEY ("id");

CREATE INDEX "shift_bookings_shiftId_meepleId_idx" ON "shift_bookings"("shiftId", "meepleId");
