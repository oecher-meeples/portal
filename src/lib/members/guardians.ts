import type { ProfilePictureVisibility } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { memberDisplayName } from "@/lib/members/member-display-name";
import { requireMember } from "@/lib/auth/session";

/** Reused by the admin guardian picker and the "Meine Kinder" section (#376). */
export type GuardianLinkOption = {
  id: string;
  displayName: string;
  /** (#412) Profilbild — nur von `listChildrenOf`/`listGuardiansOf` befüllt
   * (Anzeigestelle auf dem Kind-/eigenen Profil, immer Viewer "meeple");
   * `listGuardianCandidates` liefert eine Auswahl-Liste, kein Avatar nötig. */
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
};

const MEMBER_DISPLAY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  memberNumber: true,
  meeple: {
    select: {
      displayName: true,
      profilePictureUrl: true,
      profilePictureVisibility: true,
    },
  },
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
    profilePictureUrl: link.child.meeple?.profilePictureUrl ?? null,
    profilePictureVisibility:
      link.child.meeple?.profilePictureVisibility ?? "INTERN",
  }));
}

/** Erziehungsberechtigte eines Members — für die Admin-Verwaltungs-UI und
 * (mit `slug`) die Erziehungsberechtigten-Section auf dem Kind-Profil (#385). */
export async function listGuardiansOf(
  memberId: string,
): Promise<(GuardianLinkOption & { slug: string })[]> {
  const links = await prisma.memberGuardian.findMany({
    where: { childMemberId: memberId },
    include: {
      guardian: { select: { ...MEMBER_DISPLAY_SELECT, slug: true } },
    },
  });
  return links.map((link) => ({
    id: link.guardian.id,
    slug: link.guardian.slug,
    displayName: memberDisplayName(link.guardian),
    profilePictureUrl: link.guardian.meeple?.profilePictureUrl ?? null,
    profilePictureVisibility:
      link.guardian.meeple?.profilePictureVisibility ?? "INTERN",
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
    profilePictureUrl: member.meeple?.profilePictureUrl ?? null,
    profilePictureVisibility:
      member.meeple?.profilePictureVisibility ?? "INTERN",
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

/** Serverseitige Berechtigungsprüfung vor jedem Änderungsantrag auf ein
 * fremdes `Member` (#372) — niemals einem client-übergebenen `memberId`
 * blind vertrauen. Geteilt von Stammdaten- und Bankverbindungs-Anträgen
 * (#380/#381), beide erlauben Meeple-selbst oder dessen
 * Erziehungsberechtigte:n. */
export async function assertMaySubmitChangeFor(memberId: string) {
  const session = await requireMember();
  const targetMember = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { meepleId: true },
  });
  if (targetMember.meepleId === session.meeple.id) return;

  const ownMember = await prisma.member.findUnique({
    where: { meepleId: session.meeple.id },
    select: { id: true },
  });
  if (ownMember && (await isGuardianOf(ownMember.id, memberId))) return;

  throw new Error(
    "Du bist nicht berechtigt, einen Änderungsantrag für dieses Mitglied zu stellen.",
  );
}
