-- Mehrfachrollen-/Zeitfenster-fähiges UserRole (#335, #264)
-- Bisher: @@id([neonAuthUserId, roleId]) — genau eine Zuweisung pro
-- (Nutzer, Rolle). Neu: eine synthetische id-PK + startsAt/endsAt-Zeitfenster,
-- damit dieselbe Rolle mehrfach über die Zeit vergeben werden kann (z. B.
-- Amtszeiten), exakt-doppelte Zuweisung im selben Fenster aber weiter
-- verhindert wird (unique auf neonAuthUserId+roleId+startsAt).

-- 1. Neue Spalten zunächst nullable/mit Default anlegen, damit die bestehenden
--    9 Zeilen (Stand Migrationszeitpunkt) nicht sofort NOT NULL erzwingen.
ALTER TABLE "user_roles" ADD COLUMN "id" TEXT;
ALTER TABLE "user_roles" ADD COLUMN "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "user_roles" ADD COLUMN "endsAt" TIMESTAMP(3);

-- 2. Backfill: jede bestehende Zeile bekommt eine eindeutige id. cuid() ist
--    reine Anwendungslogik (Prisma-seitig) — für den Bestand genügt eine
--    beliebige eindeutige Textwert, hier per gen_random_uuid().
UPDATE "user_roles" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;

-- 3. id jetzt NOT NULL erzwingen und als neuen Primary Key setzen.
ALTER TABLE "user_roles" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_pkey";
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");

-- 4. Alte Uniqueness (neonAuthUserId, roleId) war die alte PK — die neue
--    fasst zusätzlich das Zeitfenster: exakt-doppelte Zuweisung im selben
--    Fenster ist weiterhin ausgeschlossen, mehrere Fenster derselben Rolle
--    über die Zeit sind es nicht mehr.
CREATE UNIQUE INDEX "user_roles_neonAuthUserId_roleId_startsAt_key" ON "user_roles"("neonAuthUserId", "roleId", "startsAt");
