-- Invites lassen sich jetzt an eine E-Mail binden (einmal einlösbar) oder
-- ungebunden lassen (mehrfach einlösbar bis Ablauf, zeigt sich als "*").
-- `expiresIn` persistiert die gewählte Dauer als Minuten-Offset, damit
-- "Verlängern" sie später erneut anwenden kann. Die 3 Bestandszeilen
-- stammen aus der Zeit vor diesem Konzept und werden gelöscht statt mit
-- einem bedeutungslosen Platzhalter befüllt.
DELETE FROM "invites";

ALTER TABLE "invites" ADD COLUMN "email" TEXT;
ALTER TABLE "invites" ADD COLUMN "expiresIn" INTEGER NOT NULL;
