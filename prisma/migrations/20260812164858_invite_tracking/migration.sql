-- Track when an invite was created and let admins revoke a still-open one,
-- so /admin/mitglieder can list which invites are offen/eingelöst/widerrufen.
ALTER TABLE "invites" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "invites" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- The invites permission now covers create + list + revoke, not just create.
-- Renamed in place (not re-inserted) so existing role_permissions rows keep pointing at it.
UPDATE "permissions" SET "key" = 'invites:manage', "description" = 'Einladungen erzeugen, einsehen und widerrufen' WHERE "key" = 'invites:create';
