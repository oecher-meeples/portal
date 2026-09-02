-- Zusammengefasste Migration (Live-Review F1, F2, F6) — ursprünglich drei
-- separate Migrationen, vor dem Commit zu einer zusammengefasst.

-- Vereinsbeitritt gehört auf Member, nicht auf Meeple (F1): die
-- Vereinsmitgliedertabelle zeigte bislang Meeple.joinedAt, das für
-- Mitglieder ohne Portal-Login (MiniMeeple/JungMeeple, #373) `null` ist.
-- Backfill für Bestand: createdAt der Member-Zeile — beste verfügbare
-- Näherung an den tatsächlichen Vereinsbeitritt ohne historische Daten.
ALTER TABLE "members" ADD COLUMN "joinedAt" TIMESTAMP(3);

UPDATE "members" SET "joinedAt" = "createdAt" WHERE "joinedAt" IS NULL;

ALTER TABLE "members" ALTER COLUMN "joinedAt" SET NOT NULL;
ALTER TABLE "members" ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Sichtbarkeits-Dropdown für "Freiwillige Angaben für andere Meeple" (F2) —
-- reine Datenerfassung für die spätere Seite "Die Meeples stellen sich
-- vor", noch ohne Konsumenten-Logik. Wiederverwendet das bestehende
-- "ProfilePictureVisibility"-Enum (#389) statt eines neuen.
ALTER TABLE "meeples" ADD COLUMN "meepleDatenVisibility" "ProfilePictureVisibility" NOT NULL DEFAULT 'INTERN';

-- Volle IBAN-Längen-Maskierung (F6) — Ländercode-Präfix als Klartext neben
-- dem bereits vorhandenen `ibanLast4`, damit `maskIban()`
-- "DE****************2051" statt nur "**** 2051" zeigen kann. `null` bei
-- Altbestand vor diesem Feld, kein Backfill nötig (`maskIban()` fällt dann
-- auf die kurze Form zurück).
ALTER TABLE "members" ADD COLUMN "ibanFirst2" TEXT;
