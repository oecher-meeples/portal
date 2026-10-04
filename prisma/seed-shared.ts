import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { createLocalAccountIssuer } from "better-auth/db";
import { prisma } from "../src/lib/utils/prisma";
import { uniqueSlug } from "../src/lib/utils/slug";
import { encryptSecret, ibanFirst2, ibanLast4 } from "../src/lib/utils/crypto";

const CREDENTIAL_ISSUER = createLocalAccountIssuer("credential");

/**
 * Legt einen Login im self-hosted better-auth an (`AuthUser` + Credential-
 * `AuthAccount`, docs/adr/0015) — dieselbe Form, die better-auths eigenes
 * Sign-up schreibt: `issuer = "local:credential"`, `accountId = userId`,
 * sonst findet der Sign-in das Passwort nicht.
 *
 * #370: ein bereits existierender User bricht hier NICHT früh ab, sondern
 * synct den Passwort-Hash auf den aktuell übergebenen Wert — sonst bleibt
 * nach einer Passwort-Änderung in `.env.local` (z. B. `SEED_ADMIN_PASSWORD`)
 * der alte Hash bestehen und der Login schlägt trotz "korrektem" Passwort
 * fehl, ohne dass Rate-Limiting oder ein Code-Bug beteiligt wäre.
 */
export async function upsertAuthUser({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const hashedPassword = await hashPassword(password);

  const existing = await prisma.authUser.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    await prisma.authAccount.upsert({
      where: {
        issuer_accountId: {
          issuer: CREDENTIAL_ISSUER,
          accountId: existing.id,
        },
      },
      update: { password: hashedPassword },
      create: {
        issuer: CREDENTIAL_ISSUER,
        accountId: existing.id,
        providerId: "credential",
        userId: existing.id,
        password: hashedPassword,
      },
    });
    console.log(
      `Auth-User "${normalizedEmail}" existiert bereits, Passwort synchronisiert.`,
    );
    return existing.id;
  }

  const userId = randomUUID();
  await prisma.authUser.create({
    data: {
      id: userId,
      name,
      email: normalizedEmail,
      emailVerified: true,
      accounts: {
        create: {
          issuer: CREDENTIAL_ISSUER,
          accountId: userId,
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  });

  console.log(`Auth-Test-User "${normalizedEmail}" angelegt (id: ${userId}).`);
  return userId;
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
