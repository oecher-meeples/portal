-- Add slug column to board_games (routing basis for the title detail page).
ALTER TABLE "board_games" ADD COLUMN "slug" TEXT;

-- Backfill from title, mirroring src/lib/utils/slug.ts slugify(): lowercase,
-- strip everything but [a-z0-9\s-], collapse whitespace runs to '-', collapse
-- repeated '-'. Collisions get a numeric suffix (-2, -3, ...) ordered by id,
-- matching uniqueSlug()'s "-2" starting suffix.
WITH base AS (
  SELECT
    "id",
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(trim("title")), '[^a-z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    ) AS base_slug
  FROM "board_games"
),
numbered AS (
  SELECT
    "id",
    base_slug,
    row_number() OVER (PARTITION BY base_slug ORDER BY "id") AS rn
  FROM base
)
UPDATE "board_games" b
SET "slug" = CASE WHEN n.rn = 1 THEN n.base_slug ELSE n.base_slug || '-' || n.rn END
FROM numbered n
WHERE b."id" = n."id";

-- Enforce NOT NULL + uniqueness now that every row has a slug.
ALTER TABLE "board_games" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "board_games_slug_key" ON "board_games"("slug");
