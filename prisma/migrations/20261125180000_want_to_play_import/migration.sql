-- Schalter wird zum Import-Schalter, Werte bleiben.
ALTER TABLE "meeples" RENAME COLUMN "shareWantToPlay" TO "importWantToPlay";

-- Bisher freigegebene Want-to-Play-Markierungen in die eigene Tabelle übernehmen.
INSERT INTO "game_want_to_play" ("id", "meepleId", "boardGameId")
SELECT gen_random_uuid()::text, e."meepleId", e."boardGameId"
FROM "private_game_collection_entries" e
JOIN "meeples" m ON m."id" = e."meepleId"
WHERE e."wantToPlay" AND m."importWantToPlay"
ON CONFLICT ("meepleId", "boardGameId") DO NOTHING;

ALTER TABLE "private_game_collection_entries" DROP COLUMN "wantToPlay";

ALTER TABLE "private_collection_import_jobs"
  ADD COLUMN "wantToPlayCount" INTEGER,
  ADD COLUMN "wantToPlayError" TEXT;
