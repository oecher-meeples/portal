-- Backfill (Epic #490 Strang B): Bestandstitel, deren Mechaniken/Kategorien
-- noch nur in den String-Spalten stehen, bekommen ihre Tags, bevor die
-- Spalten entfallen. Gespeichert sind die übersetzten Anzeigenamen; ein
-- Label trifft zuerst einen vorhandenen Tag gleichen Typs über `displayName`
-- oder normalisierten `name` (bevorzugt mit BGG-ID), sonst entsteht ein Tag
-- ohne BGG-ID mit `name = label` (`dedupKey` = `<TYPE>:name:<normalisiert>`,
-- wie `taxonomyDedupKey` in `lib/ludothek/taxonomy/normalize.ts`).

CREATE TEMP TABLE "_tag_labels" AS
SELECT DISTINCT
  g."id" AS "boardGameId",
  l."type"::"TagType" AS "type",
  regexp_replace(btrim(l."label"), '\s+', ' ', 'g') AS "label",
  lower(regexp_replace(btrim(l."label"), '\s+', ' ', 'g')) AS "normalizedName"
FROM "board_games" g
CROSS JOIN LATERAL (
  SELECT 'MECHANIC' AS "type", m AS "label" FROM unnest(g."mechanics") AS m
  UNION ALL
  SELECT 'CATEGORY', c FROM unnest(g."categories") AS c
) l
WHERE btrim(l."label") <> '';

INSERT INTO "tags" ("id", "dedupKey", "type", "name", "normalizedName", "updatedAt")
SELECT DISTINCT ON (t."type", t."normalizedName")
  gen_random_uuid()::text,
  t."type"::text || ':name:' || t."normalizedName",
  t."type",
  t."label",
  t."normalizedName",
  CURRENT_TIMESTAMP
FROM "_tag_labels" t
WHERE NOT EXISTS (
  SELECT 1 FROM "tags" x
  WHERE x."type" = t."type"
    AND (lower(btrim(x."displayName")) = t."normalizedName"
      OR x."normalizedName" = t."normalizedName")
)
ORDER BY t."type", t."normalizedName", t."label"
ON CONFLICT ("dedupKey") DO NOTHING;

INSERT INTO "board_game_tags" ("boardGameId", "tagId")
SELECT t."boardGameId", m."id"
FROM "_tag_labels" t
CROSS JOIN LATERAL (
  SELECT x."id" FROM "tags" x
  WHERE x."type" = t."type"
    AND (lower(btrim(x."displayName")) = t."normalizedName"
      OR x."normalizedName" = t."normalizedName")
  ORDER BY x."bggId" ASC NULLS LAST
  LIMIT 1
) m
ON CONFLICT DO NOTHING;

DROP TABLE "_tag_labels";

-- AlterTable
ALTER TABLE "board_games" DROP COLUMN "categories",
DROP COLUMN "mechanics";
