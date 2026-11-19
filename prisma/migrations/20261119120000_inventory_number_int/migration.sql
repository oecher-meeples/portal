-- #543: Inventarnummer als Ganzzahl statt Freitext. Es gibt noch keine
-- Live-Daten; der USING-Cast scheitert bewusst laut, falls doch ein
-- nicht-numerischer Wert existiert, statt ihn still zu verwerfen.
ALTER TABLE "game_copies" ALTER COLUMN "inventoryNumber" SET DATA TYPE INTEGER USING "inventoryNumber"::INTEGER;
