-- Rein optische Spaltenposition innerhalb der Rollen-Spaltengruppe im
-- Schichtplan-Grid, per Drag setzbar. null = automatisch ableiten.
ALTER TABLE "shift_bookings" ADD COLUMN "slotIndex" INTEGER;
