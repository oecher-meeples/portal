import { prisma } from "../src/lib/utils/prisma";
import { uniqueSlug } from "../src/lib/utils/slug";
import { assignRole } from "./seed-roles";
import {
  DEMO_FAMILY_VATER,
  DEMO_FAMILY_MUTTER,
  DEMO_FAMILY_JUNGSOHN,
  DEMO_FAMILY_MINITOCHTER,
  type DemoFamilyParent,
  type DemoFamilyChild,
} from "./seed-data/demo-family";
import { randomDemoContactFields } from "./seed-data/demo-contacts";
import {
  upsertNeonAuthUser,
  ensureMeeple,
  ensureDemoMember,
  nextMemberNumber,
} from "./seed-shared";

/** Vater/Mutter — Meeple-Account (Login) plus zugehöriges `Member` (inkl.
 * Adresse und IBAN, siehe `ensureDemoMember`) und zufällige Kontaktfelder. */
async function ensureFamilyParentMember(person: DemoFamilyParent) {
  const userId = await upsertNeonAuthUser(person);
  await assignRole(userId, "Meeple");
  const meeple = await ensureMeeple(userId, person.name);
  await prisma.meeple.update({
    where: { id: meeple.id },
    data: randomDemoContactFields(person.email),
  });

  const member = await ensureDemoMember(meeple.id, person);
  return { meeple, member };
}

/** Kind — `Member` ohne `meepleId` (kein eigener Login), E-Mail optional. */
async function ensureFamilyChildMember(person: DemoFamilyChild) {
  const existing = person.email
    ? await prisma.member.findUnique({ where: { email: person.email } })
    : await prisma.member.findFirst({
        where: {
          firstName: person.firstName,
          lastName: person.lastName,
          meepleId: null,
        },
      });
  if (existing) return existing;

  const slug = await uniqueSlug(
    `${person.firstName} ${person.lastName}`,
    async (candidate) =>
      (await prisma.member.findUnique({ where: { slug: candidate } })) !== null,
  );

  return prisma.member.create({
    data: {
      memberNumber: await nextMemberNumber(),
      slug,
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName,
      birthDate: person.birthDate,
      street: person.street,
      postalCode: person.postalCode,
      city: person.city,
    },
  });
}

async function ensureGuardianLink(
  childMemberId: string,
  guardianMemberId: string,
) {
  await prisma.memberGuardian.upsert({
    where: {
      childMemberId_guardianMemberId: { childMemberId, guardianMemberId },
    },
    update: {},
    create: { childMemberId, guardianMemberId },
  });
}

/**
 * Demo-Familie "Musterfamilie" (#373-Testdaten) — deckt das
 * Erziehungsberechtigte-Modell mit realistischen Rollen ab: Vater/Mutter mit
 * Meeple-Account, MiniTochter/JungSohn ohne, jeweils beiden Elternteilen als
 * Kind zugeordnet. Details/Altersgrenzen siehe `seed-data/demo-family.ts`.
 * Gibt die Meeple-Ids der Eltern sowie alle vier Member-Ids zurück — Letztere
 * u. a. für die Demo-Ausleihhistorie (`seed-loans.ts`), die an `Member`,
 * nicht an `Meeple` hängt.
 */
export async function seedDemoFamily() {
  const { meeple: vaterMeeple, member: vaterMember } =
    await ensureFamilyParentMember(DEMO_FAMILY_VATER);
  const { meeple: mutterMeeple, member: mutterMember } =
    await ensureFamilyParentMember(DEMO_FAMILY_MUTTER);
  const jungSohnMember = await ensureFamilyChildMember(DEMO_FAMILY_JUNGSOHN);
  const miniTochterMember = await ensureFamilyChildMember(
    DEMO_FAMILY_MINITOCHTER,
  );

  for (const child of [jungSohnMember, miniTochterMember]) {
    await ensureGuardianLink(child.id, vaterMember.id);
    await ensureGuardianLink(child.id, mutterMember.id);
  }

  console.log(
    'Demo-Familie "Musterfamilie" angelegt/übersprungen (Vater, Mutter, JungSohn, MiniTochter).',
  );

  return {
    vaterMeepleId: vaterMeeple.id,
    mutterMeepleId: mutterMeeple.id,
    memberIds: [
      vaterMember.id,
      mutterMember.id,
      jungSohnMember.id,
      miniTochterMember.id,
    ],
  };
}
