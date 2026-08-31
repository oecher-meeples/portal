import { prisma } from "@/lib/utils/prisma";
import { memberDisplayName } from "@/lib/members/member-display-name";

/** Reused by the admin guardian picker and the "Meine Kinder" section (#376). */
export type GuardianLinkOption = { id: string; displayName: string };

const MEMBER_DISPLAY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  memberNumber: true,
  meeple: { select: { displayName: true } },
} as const;

/** Serverseitige Berechtigungsprüfung (#372) — niemals einem
 * client-übergebenen `memberId` blind vertrauen: jede Aktion, die ein
 * Erziehungsberechtigter im Namen eines Kindes ausführt, muss vorher hier
 * verifizieren, dass die Verknüpfung tatsächlich besteht. */
export async function isGuardianOf(
  guardianMemberId: string,
  childMemberId: string,
): Promise<boolean> {
  const link = await prisma.memberGuardian.findUnique({
    where: {
      childMemberId_guardianMemberId: { childMemberId, guardianMemberId },
    },
  });
  return link !== null;
}

/** Kinder eines Erziehungsberechtigten, für dessen eigenes Profil (#376) —
 * niemals für andere sichtbar. */
export async function listChildrenOf(
  memberId: string,
): Promise<(GuardianLinkOption & { slug: string })[]> {
  const links = await prisma.memberGuardian.findMany({
    where: { guardianMemberId: memberId },
    include: {
      child: { select: { ...MEMBER_DISPLAY_SELECT, slug: true } },
    },
  });
  return links.map((link) => ({
    id: link.child.id,
    slug: link.child.slug,
    displayName: memberDisplayName(link.child),
  }));
}

/** Erziehungsberechtigte eines Members, für die Admin-Verwaltungs-UI. */
export async function listGuardiansOf(
  memberId: string,
): Promise<GuardianLinkOption[]> {
  const links = await prisma.memberGuardian.findMany({
    where: { childMemberId: memberId },
    include: { guardian: { select: MEMBER_DISPLAY_SELECT } },
  });
  return links.map((link) => ({
    id: link.guardian.id,
    displayName: memberDisplayName(link.guardian),
  }));
}

/** Alle Members außer sich selbst, als Auswahlkandidaten für die
 * Erziehungsberechtigten-Verknüpfung. */
export async function listGuardianCandidates(
  excludeMemberId: string,
): Promise<GuardianLinkOption[]> {
  const members = await prisma.member.findMany({
    where: { id: { not: excludeMemberId } },
    select: MEMBER_DISPLAY_SELECT,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return members.map((member) => ({
    id: member.id,
    displayName: memberDisplayName(member),
  }));
}

export async function addGuardianLink(
  childMemberId: string,
  guardianMemberId: string,
) {
  if (childMemberId === guardianMemberId) {
    throw new Error(
      "Ein Mitglied kann nicht sein eigener Erziehungsberechtigter sein.",
    );
  }
  await prisma.memberGuardian.upsert({
    where: {
      childMemberId_guardianMemberId: { childMemberId, guardianMemberId },
    },
    create: { childMemberId, guardianMemberId },
    update: {},
  });
}

export async function removeGuardianLink(
  childMemberId: string,
  guardianMemberId: string,
) {
  await prisma.memberGuardian.deleteMany({
    where: { childMemberId, guardianMemberId },
  });
}
