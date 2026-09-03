import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/utils/prisma";
import { uniqueSlug } from "../src/lib/utils/slug";
import { encryptSecret, ibanFirst2, ibanLast4 } from "../src/lib/utils/crypto";

/**
 * #370: ein bereits existierender User bricht hier NICHT früh ab, sondern
 * synct den Passwort-Hash auf den aktuell übergebenen Wert — sonst bleibt
 * nach einer Passwort-Änderung in `.env.local` (z. B. `SEED_ADMIN_PASSWORD`)
 * der alte Hash bestehen und der Login schlägt trotz "korrektem" Passwort
 * fehl, ohne dass Rate-Limiting oder ein Code-Bug beteiligt wäre.
 */
export async function upsertNeonAuthUser({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  const hashedPassword = await hashPassword(password);

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM neon_auth."user" WHERE email = ${email}
  `;
  if (existing.length > 0) {
    const userId = existing[0].id;
    await prisma.$executeRaw`
      UPDATE neon_auth."account"
      SET password = ${hashedPassword}, "updatedAt" = now()
      WHERE "userId" = ${userId}::uuid AND "providerId" = 'credential'
    `;
    console.log(
      `Neon-Auth-User "${email}" existiert bereits, Passwort synchronisiert.`,
    );
    return userId;
  }

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

export async function ensureMeeple(
  neonAuthUserId: string,
  displayName: string,
) {
  return prisma.meeple.upsert({
    where: { neonAuthUserId },
    update: {},
    create: { neonAuthUserId, displayName },
  });
}

export async function nextMemberNumber(): Promise<number> {
  const highestNumber = await prisma.member.aggregate({
    _max: { memberNumber: true },
  });
  return (highestNumber._max.memberNumber ?? 0) + 1;
}

export type DemoMemberInfo = {
  email: string;
  firstName: string;
  lastName: string;
  birthDate?: Date;
  street: string;
  postalCode: string;
  city: string;
  /** Unverschlüsselt, z. B. aus `prisma/seed-data/demo-accounts.ts` — wird
   * hier wie im echten Formular (`pending-changes.ts`) verschlüsselt
   * abgelegt. Weggelassen (z. B. JungSohn/MiniTochter) heißt: kein Bankdatensatz. */
  iban?: string;
  accountHolder?: string;
  /** Für den Beitritt zurückdatierbar (z. B. Demo-"ausgetretenes" Mitglied,
   * dessen `joinedAt` Jahre vor dem Austritt liegen soll) — weggelassen
   * bleibt es beim Prisma-Default (`now()`). */
  joinedAt?: Date;
  /** Zusammen mit `membershipEndsAt` für einen Demo-Austritt (`ausgetreten`/
   * `gekuendigt`-Status, siehe `getMembershipState()`) — beide weggelassen
   * heißt aktives Mitglied. */
  resignedAt?: Date;
  membershipEndsAt?: Date;
};

/**
 * Legt zu einem bestehenden Meeple das begleitende `Member` (Vereinsmitgliedschaft,
 * #328) an oder bringt ein bereits vorhandenes auf den aktuellen Stand — geteilt
 * zwischen `seed.ts` (Admin/Rollen-Accounts/Demo-Meeples) und `seed-family.ts`
 * (Musterfamilie-Eltern), damit Adress-/IBAN-Handling nicht doppelt gepflegt wird.
 * Upsert über `email`, nicht `meepleId`, da `Member.meepleId` erst nach Anlage
 * des `Member` gesetzt werden kann.
 */
export async function ensureDemoMember(meepleId: string, info: DemoMemberInfo) {
  const ibanFields = info.iban
    ? {
        ibanEncrypted: encryptSecret(info.iban),
        ibanFirst2: ibanFirst2(info.iban),
        ibanLast4: ibanLast4(info.iban),
        accountHolder:
          info.accountHolder ?? `${info.firstName} ${info.lastName}`,
      }
    : {};

  const existing = await prisma.member.findUnique({
    where: { email: info.email },
  });
  if (existing) {
    return prisma.member.update({
      where: { id: existing.id },
      data: {
        firstName: info.firstName,
        lastName: info.lastName,
        birthDate: info.birthDate,
        street: info.street,
        postalCode: info.postalCode,
        city: info.city,
        meepleId,
        joinedAt: info.joinedAt,
        resignedAt: info.resignedAt,
        membershipEndsAt: info.membershipEndsAt,
        ...ibanFields,
      },
    });
  }

  const slug = await uniqueSlug(
    `${info.firstName} ${info.lastName}`,
    async (candidate) =>
      (await prisma.member.findUnique({ where: { slug: candidate } })) !== null,
  );

  return prisma.member.create({
    data: {
      memberNumber: await nextMemberNumber(),
      slug,
      email: info.email,
      firstName: info.firstName,
      lastName: info.lastName,
      birthDate: info.birthDate,
      street: info.street,
      postalCode: info.postalCode,
      city: info.city,
      meepleId,
      joinedAt: info.joinedAt,
      resignedAt: info.resignedAt,
      membershipEndsAt: info.membershipEndsAt,
      ...ibanFields,
    },
  });
}
