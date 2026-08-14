-- Manual sort order for the public/internal downloads list (see #113).
-- Backfilled to match the previous createdAt-asc ordering so existing
-- downloads keep their current position after this migration.
ALTER TABLE "downloads" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) - 1 AS "rank"
  FROM "downloads"
)
UPDATE "downloads"
SET "order" = ranked."rank"
FROM ranked
WHERE "downloads"."id" = ranked."id";
