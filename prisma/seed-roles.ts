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
];

const ROLES = [
  {
    name: "sysadmin",
    description: "Vollzugriff",
    permissionKeys: PERMISSIONS.map((p) => p.key),
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
    permissionKeys: [],
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
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
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

export async function assignRole(neonAuthUserId: string, roleName: string) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: roleName },
  });
  await prisma.userRole.upsert({
    where: { neonAuthUserId_roleId: { neonAuthUserId, roleId: role.id } },
    update: {},
    create: { neonAuthUserId, roleId: role.id },
  });
}
