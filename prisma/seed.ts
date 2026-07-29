import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";

const ADMIN_USER = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@jan-herwig.de",
  password: process.env.SEED_ADMIN_PASSWORD ?? "admin",
  name: "Admin",
};

const PERMISSIONS = [
  { key: "posts:write", description: "Beiträge erstellen und bearbeiten" },
  { key: "posts:delete", description: "Beiträge löschen" },
  { key: "invites:create", description: "Einladungen erzeugen" },
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
];

const ROLES = [
  {
    name: "admin",
    description: "Vollzugriff",
    permissionKeys: PERMISSIONS.map((p) => p.key),
  },
  {
    name: "moderator",
    description: "Redaktion",
    permissionKeys: ["posts:write"],
  },
  {
    name: "kassenwart",
    description: "Beitragseinzug — darf Bankdaten entschlüsseln, jeder Zugriff wird protokolliert",
    permissionKeys: ["bank:read"],
  },
  {
    name: "mitglied",
    description: "Standardrolle nach Registrierung",
    permissionKeys: [],
  },
];

async function upsertNeonAuthUser({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM neon_auth."user" WHERE email = ${email}
  `;
  if (existing.length > 0) {
    console.log(`Neon-Auth-User "${email}" existiert bereits, überspringe.`);
    return existing[0].id;
  }

  const hashedPassword = await hashPassword(password);

  const [user] = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${name}, ${email}, true, now(), now())
    RETURNING id
  `;

  await prisma.$executeRaw`
    INSERT INTO neon_auth."account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${user.id}, 'credential', ${user.id}::uuid, ${hashedPassword}, now(), now())
  `;

  console.log(`Neon-Auth-Test-User "${email}" angelegt (id: ${user.id}).`);
  return user.id;
}

async function seedPermissions() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }
}

async function seedRoles() {
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

async function assignRole(neonAuthUserId: string, roleName: string) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: roleName },
  });
  await prisma.userRole.upsert({
    where: { neonAuthUserId_roleId: { neonAuthUserId, roleId: role.id } },
    update: {},
    create: { neonAuthUserId, roleId: role.id },
  });
}

async function main() {
  const adminUserId = await upsertNeonAuthUser(ADMIN_USER);
  await seedPermissions();
  await seedRoles();
  await assignRole(adminUserId, "admin");
  console.log("Seed abgeschlossen.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
