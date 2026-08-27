-- Data migration (#153): Shift becomes a demand container tied to a
-- specific EventDay, with its own target period instead of a directly
-- shared booking window. Defensively backfills a missing EventDay for any
-- pre-#150 shift whose event has no matching day yet, so the following
-- dayId backfill never leaves a row without a match.
INSERT INTO "event_days" ("id", "eventId", "date", "updatedAt")
SELECT DISTINCT
    'eventday-' || md5(s."eventId" || date_trunc('day', s."startsAt")::text),
    s."eventId",
    date_trunc('day', s."startsAt"),
    CURRENT_TIMESTAMP
FROM "shifts" s
WHERE NOT EXISTS (
    SELECT 1 FROM "event_days" ed
    WHERE ed."eventId" = s."eventId"
      AND ed."date" = date_trunc('day', s."startsAt")
);

-- AlterTable: add dayId, backfill by matching the shift's former startsAt to
-- the EventDay of the same calendar day, then enforce NOT NULL.
ALTER TABLE "shifts" ADD COLUMN "dayId" TEXT;

UPDATE "shifts" s
SET "dayId" = ed.id
FROM "event_days" ed
WHERE ed."eventId" = s."eventId"
  AND ed."date" = date_trunc('day', s."startsAt");

ALTER TABLE "shifts" ALTER COLUMN "dayId" SET NOT NULL;

-- Rename the former shared booking window to the target period (ADR/#153:
-- "bisheriges Zeitfenster wird zum Ziel-Zeitraum") — values are unchanged.
ALTER TABLE "shifts" RENAME COLUMN "startsAt" TO "targetStartsAt";
ALTER TABLE "shifts" RENAME COLUMN "endsAt" TO "targetEndsAt";

-- CreateIndex
CREATE INDEX "shifts_dayId_idx" ON "shifts"("dayId");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "event_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
