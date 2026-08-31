import { prisma } from "../src/lib/utils/prisma";

const PERMISSIONS = [
  {
    key: "admin:access",
    description:
      'Zugriff auf den Admin-Bereich und dessen Tier-Vorschau (ersetzt die frühere Prüfung auf den Rollennamen "admin", siehe src/lib/auth/session.ts)',
  },
  { key: "posts:write", description: "Beiträge erstellen und bearbeiten" },
  { key: "posts:delete", description: "Beiträge löschen" },
  {
    key: "invites:manage",
    description: "Einladungen erzeugen, einsehen und widerrufen",
  },
  { key: "members:manage", description: "Mitgliederverwaltung" },
  {
    key: "roles:manage",
    description:
      "Rollen und deren Rechte bearbeiten (#365) — bewusst getrennt von members:manage, damit nicht jeder Mitglieder-Admin auch die Rollenverwaltung selbst ändern kann",
  },
  {
    key: "instagram:connect",
    description: "Instagram-Verbindung verwalten (OAuth verbinden/trennen)",
  },
  {
    key: "games:manage",
    description:
      "Ludothek verwalten: Spiele und Aufbewahrungseinheiten anlegen, bearbeiten und stilllegen, EAN pflegen, Etiketten drucken, fremde Aufenthalte korrigieren, Mängel schließen, deinventarisieren",
  },
  {
    key: "bank:read",
    description: "Bankdaten entschlüsselt einsehen und exportieren",
  },
  {
    key: "events:manage",
    description:
      "Events, Schichten und Regal-Zuordnungen verwalten, Flohmarkt-Artikel freigeben/Kasse bedienen außerhalb einer Kasse-Schicht",
  },
  {
    key: "downloads:manage",
    description:
      "Downloads verwalten (hochladen, Sichtbarkeit ändern, löschen)",
  },
  {
    key: "legal:manage",
    description:
      "Rechtliches-Dokumente verwalten (PDF hochladen, Sections bearbeiten)",
  },
  {
    key: "links:manage",
    description: "Wichtige Links verwalten (anlegen, bearbeiten, löschen)",
  },
  {
    key: "ludothek:view",
    description:
      "Ludothek-Bestand als eingeloggtes Mitglied sehen (Zustand, Standort, Ausleihhistorie) statt nur der öffentlichen Gast-Ansicht",
  },
  {
    key: "ludothek:borrow",
    description:
      "Spiele selbst ausleihen, zurückgeben und weitergeben (Scan-Flow)",
  },
  {
    key: "news:internal:view",
    description: "Interne (vereinsinterne) News-Beiträge lesen",
  },
  {
    key: "lfg:participate",
    description: "Spielergesuche anlegen, beitreten und verwalten",
  },
  {
    key: "market:participate",
    description: "Marktplatz-Angebote anlegen und darauf reagieren",
  },
];

/** Regulärer Funktionsumfang eines eingeloggten Meeples ohne Sonderrolle
 * (siehe #335) — die Standardrolle "Meeple" bekommt genau diesen Satz,
 * die künftige "Ausgetreten"-Rolle (#332) einen Teil davon. */
export const REGULAR_MEEPLE_PERMISSION_KEYS = [
  "ludothek:view",
  "ludothek:borrow",
  "news:internal:view",
  "lfg:participate",
  "market:participate",
];

/** #332: der volle Meeple-Katalog abzüglich Ludothek-/interner-News-/
 * Spielergesuch-Rechte — `market:participate` bleibt (der Marktplatz ist kein
 * Vereinsspiel-Zugang). Wird nur vom Jahreswechsel-Cron gesetzt/entfernt,
 * nie manuell im UI (siehe `year-turn-cron.ts`). */
export const AUSGETRETEN_PERMISSION_KEYS =
  REGULAR_MEEPLE_PERMISSION_KEYS.filter(
    (key) =>
      ![
        "ludothek:view",
        "ludothek:borrow",
        "news:internal:view",
        "lfg:participate",
      ].includes(key),
  );

const ROLES = [
  {
    name: "sysadmin",
    description: "Vollzugriff",
    permissionKeys: PERMISSIONS.map((p) => p.key),
    isSystemRole: true,
  },
  {
    name: "Vorstand",
    description:
      "Vereinsvorstand — verwaltet Mitglieder, Einladungen, Events, Ludothek, Downloads, Rechtliches und wichtige Links",
    permissionKeys: [
      "members:manage",
      "invites:manage",
      "events:manage",
      "games:manage",
      "downloads:manage",
      "legal:manage",
      "links:manage",
    ],
  },
  {
    name: "Kassenwart",
    description:
      "Beitragseinzug — darf Bankdaten entschlüsseln, jeder Zugriff wird protokolliert",
    permissionKeys: ["bank:read"],
  },
  {
    name: "Spielewart",
    description: "Ludothek verwalten",
    permissionKeys: ["games:manage"],
  },
  {
    name: "Redakteur",
    description: "Redaktion — Beiträge und Instagram-Verbindung verwalten",
    permissionKeys: ["posts:write", "posts:delete", "instagram:connect"],
  },
  {
    name: "Meeple",
    description: "Standardrolle nach Registrierung",
    permissionKeys: REGULAR_MEEPLE_PERMISSION_KEYS,
  },
  {
    name: "Ausgetreten",
    description:
      "Nur vom Jahreswechsel-Cron vergeben (#332) — kein manuelles Zuweisen im UI",
    permissionKeys: AUSGETRETEN_PERMISSION_KEYS,
    isSystemRole: true,
  },
];

export async function seedPermissions() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }
}

export async function seedRoles() {
  for (const [sortOrder, role] of ROLES.entries()) {
    const isSystemRole = "isSystemRole" in role ? role.isSystemRole : false;
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystemRole, sortOrder },
      create: {
        name: role.name,
        description: role.description,
        isSystemRole,
        sortOrder,
      },
    });

    for (const permissionKey of role.permissionKeys) {
      const [dbRole, dbPermission] = await Promise.all([
        prisma.role.findUniqueOrThrow({ where: { name: role.name } }),
        prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } }),
      ]);

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: dbRole.id,
            permissionId: dbPermission.id,
          },
        },
        update: {},
        create: { roleId: dbRole.id, permissionId: dbPermission.id },
      });
    }
  }
}

/**
 * Idempotent seed helper — a role assignment now carries a `startsAt`
 * (mehrfachrollen-/zeitfenster-fähig, siehe #335/#264), so `upsert` on the
 * old two-column key no longer applies: re-running the seed would otherwise
 * create a fresh row (new `startsAt`) every time. Skip if any assignment for
 * this role already exists, regardless of window.
 */
export async function assignRole(neonAuthUserId: string, roleName: string) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: roleName },
  });
  const existing = await prisma.userRole.findFirst({
    where: { neonAuthUserId, roleId: role.id },
  });
  if (existing) return;

  await prisma.userRole.create({
    data: { neonAuthUserId, roleId: role.id },
  });
}
