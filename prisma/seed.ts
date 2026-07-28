import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";

const TEST_USER = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@jan-herwig.de",
  password: process.env.SEED_ADMIN_PASSWORD ?? "admin",
  name: "Admin",
};

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

async function main() {
  await upsertNeonAuthUser(TEST_USER);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
