-- Paket 5 (#333, Vereinsmitglied/Meeple-Split, ADR 0013): a GameHolding's
-- person-side target is the official membership (`Member`), not the portal
-- account (`Meeple`) — someone can hold a club game without ever having
-- logged in (e.g. an external loan-out, see #333 "An extern ausgeben").

-- 1. Drop the old Meeple-pointing FK first — steps 2/3 below write Member
--    ids into this column while it's still (structurally) a "meepleId"
--    column, which the old FK would otherwise reject.
ALTER TABLE "game_holdings" DROP CONSTRAINT "game_holdings_meepleId_fkey";

-- 2. A GameHolding pointing at a Meeple with no paired Member row (only
--    seed-only/system Meeples without an email ever lacked one, see the
--    Paket 2 migration) has nothing to remap to — null it out first so step 3
--    can't accidentally leave a stale Meeple-id sitting in a Member-id column.
UPDATE "game_holdings" gh
SET "meepleId" = NULL
WHERE gh."meepleId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "members" m WHERE m."meepleId" = gh."meepleId"
  );

-- 3. Remap every remaining meepleId to the 1:1-paired Member's id (see the
--    Paket 2 migration: every Meeple with an email got exactly one Member row).
UPDATE "game_holdings" gh
SET "meepleId" = m."id"
FROM "members" m
WHERE m."meepleId" = gh."meepleId";

-- 4. Rename column, index and FK to point at "members" instead of "meeples".
DROP INDEX "game_holdings_meepleId_idx";
ALTER TABLE "game_holdings" RENAME COLUMN "meepleId" TO "vereinsmitgliedId";
CREATE INDEX "game_holdings_vereinsmitgliedId_idx" ON "game_holdings"("vereinsmitgliedId");
ALTER TABLE "game_holdings" ADD CONSTRAINT "game_holdings_vereinsmitgliedId_fkey" FOREIGN KEY ("vereinsmitgliedId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
