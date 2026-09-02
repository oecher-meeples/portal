-- Data migration (#321): posts:write wird in posts:public + posts:internal
-- aufgesplittet — reine Katalog-/Zuweisungsänderung, kein Schema-Diff (die
-- Permission-Tabellen sind bereits generisch). Jede Rolle, die bisher
-- posts:write hatte, bekommt beide neuen Rechte (sicherer Superset des
-- bisherigen Zugriffs) — eine manuelle Verengung pro Rolle bleibt dem
-- Vorstand im UI überlassen.

-- 1. Neue Permissions anlegen.
INSERT INTO "permissions" ("id", "key", "description")
VALUES
  (gen_random_uuid()::text, 'posts:public', 'Öffentliche Beiträge anzeigen, bearbeiten und senden (inkl. Instagram-Crosspost, sofern verbunden) — Nachfolger von posts:write (#321)'),
  (gen_random_uuid()::text, 'posts:internal', 'Interne (vereinsinterne) Beiträge anzeigen, bearbeiten und senden (#321)');

-- 2. Jede Rolle mit posts:write bekommt beide neuen Rechte.
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT rp."roleId", p."id"
FROM "role_permissions" rp
JOIN "permissions" pw ON pw."id" = rp."permissionId" AND pw."key" = 'posts:write'
CROSS JOIN "permissions" p
WHERE p."key" IN ('posts:public', 'posts:internal')
ON CONFLICT DO NOTHING;

-- 3. Alte posts:write-Zuweisungen entfernen, dann die Permission selbst.
DELETE FROM "role_permissions" rp
USING "permissions" pw
WHERE rp."permissionId" = pw."id" AND pw."key" = 'posts:write';

DELETE FROM "permissions" WHERE "key" = 'posts:write';
