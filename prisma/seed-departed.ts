import { prisma } from "../src/lib/utils/prisma";
import { ANONYMER_MEEPLE_NAME } from "../src/lib/ludothek/anonymer-meeple";
import {
  DEMO_RESIGNED_MEMBER,
  DEMO_ANONYMISED_MEEPLE,
} from "./seed-data/demo-departed";
import { randomDemoContactFields } from "./seed-data/demo-contacts";
import {
  upsertNeonAuthUser,
  ensureMeeple,
  ensureDemoMember,
} from "./seed-shared";
import { assignRole } from "./seed-roles";

/** Login, Meeple und `Member` mit `resignedAt`/`membershipEndsAt` in der
 * Vergangenheit — Status "ausgetreten", aber noch nicht anonymisiert (siehe
 * `seed-data/demo-departed.ts`). */
export async function seedDemoResignedMember() {
  const userId = await upsertNeonAuthUser(DEMO_RESIGNED_MEMBER);
  await assignRole(userId, "Meeple");
  const meeple = await ensureMeeple(userId, DEMO_RESIGNED_MEMBER.name);
  await prisma.meeple.update({
    where: { id: meeple.id },
    data: randomDemoContactFields(DEMO_RESIGNED_MEMBER.email),
  });
  const member = await ensureDemoMember(meeple.id, DEMO_RESIGNED_MEMBER);

  console.log(
    `Demo-Vereinsmitglied "${DEMO_RESIGNED_MEMBER.name}" angelegt/übersprungen (Status "ausgetreten").`,
  );

  return { memberId: member.id };
}

/**
 * Ein bereits Stufe-2-anonymisiertes Alt-Meeple, unabhängig vom dauerhaften
 * Sammelkonto "Anonymer Meeple" (`ensureAnonymerMeeple()` in `seed.ts`) —
 * gleicher Anzeigename, aber eigene, feste `id` für ein idempotentes Upsert
 * (kein Login mehr, `displayName` allein wäre nicht eindeutig genug, siehe
 * `ANONYMER_MEEPLE_NAME`-Kollision mit dem Sammelkonto).
 */
export async function seedDemoAnonymisedMeeple() {
  await prisma.meeple.upsert({
    where: { id: DEMO_ANONYMISED_MEEPLE.id },
    update: {},
    create: {
      id: DEMO_ANONYMISED_MEEPLE.id,
      displayName: ANONYMER_MEEPLE_NAME,
      joinedAt: DEMO_ANONYMISED_MEEPLE.joinedAt,
      anonymizedAt: DEMO_ANONYMISED_MEEPLE.anonymizedAt,
      neonAuthUserId: null,
    },
  });

  console.log(
    "Demo-anonymisiertes Alt-Meeple angelegt/übersprungen (kein Login, kein Member).",
  );
}
