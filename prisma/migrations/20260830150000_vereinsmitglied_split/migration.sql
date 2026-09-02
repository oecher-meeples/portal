-- Vereinsmitglied/Meeple-Split (ADR 0013, #328): the official membership
-- record (`Member`) is separated from the portal account (`Meeple`).
-- `Meeple.email`/`.ibanEncrypted`/`.ibanLast4`/`.accountHolder`/`.resignedAt`/
-- `.membershipEndsAt` move to the new table.

-- 1. New table.
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "memberNumber" INTEGER NOT NULL,
    "lastName" TEXT,
    "firstName" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "selbstgewaehlterBeitrag" DECIMAL(65,30),
    "ibanEncrypted" TEXT,
    "ibanLast4" TEXT,
    "accountHolder" TEXT,
    "resignedAt" TIMESTAMP(3),
    "membershipEndsAt" TIMESTAMP(3),
    "meepleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- 2. Backfill: one Member row per existing Meeple that actually has an email
--    today — `email` is required+unique on `members`, so a Meeple that never
--    logged in with a real address (seed-only accounts) gets no Member row
--    rather than a fabricated placeholder. Every other Member field (name,
--    birth date, address, phone, selbstgewaehlterBeitrag) is new territory
--    with no source column and stays NULL — no guessed data (see #328).
INSERT INTO "members" (
  "id", "memberNumber", "email", "ibanEncrypted", "ibanLast4",
  "accountHolder", "resignedAt", "membershipEndsAt", "meepleId", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  m."memberNumber",
  lower(m."email"),
  m."ibanEncrypted",
  m."ibanLast4",
  m."accountHolder",
  m."resignedAt",
  m."membershipEndsAt",
  m."id",
  now()
FROM "meeples" m
WHERE m."email" IS NOT NULL;

-- 3. Uniqueness + FK, added after backfill so the insert above can't collide
--    with itself.
CREATE UNIQUE INDEX "members_memberNumber_key" ON "members"("memberNumber");
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");
CREATE UNIQUE INDEX "members_meepleId_key" ON "members"("meepleId");

ALTER TABLE "members" ADD CONSTRAINT "members_meepleId_fkey" FOREIGN KEY ("meepleId") REFERENCES "meeples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Drop the moved columns from meeples.
ALTER TABLE "meeples" DROP COLUMN "email";
ALTER TABLE "meeples" DROP COLUMN "ibanEncrypted";
ALTER TABLE "meeples" DROP COLUMN "ibanLast4";
ALTER TABLE "meeples" DROP COLUMN "accountHolder";
ALTER TABLE "meeples" DROP COLUMN "resignedAt";
ALTER TABLE "meeples" DROP COLUMN "membershipEndsAt";
