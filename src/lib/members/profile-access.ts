import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { isGuardianOf } from "@/lib/members/guardians";

/** Which permission keys grant unconditional access to `/profil`/`/profil/[slug]`
 * (#379) — admin, Vorstand (`members:manage`), Kassenwart (`bank:read`),
 * Spielewart (`games:manage`). Kept as an object below, not this array
 * alone, so each flag stays individually usable for section-level gating
 * (e.g. the Bankverbindungs-Bereich only wants `canReadBank`/`canManage`). */
export type ProfileViewerContext = {
  currentMeepleId: string;
  currentMemberId: string | null;
  isAdmin: boolean;
  canManageMembers: boolean;
  canReadBank: boolean;
  canManageGames: boolean;
  isGuardianOfTarget: boolean;
};

/** Pure access decision (analog `isEventVisible`) — separated from the
 * Prisma/session lookups in `loadProfileViewerContext` so the rule itself is
 * trivially unit-testable. */
export function canAccessMemberProfile(
  target: { meepleId: string | null },
  context: ProfileViewerContext,
): boolean {
  if (
    context.isAdmin ||
    context.canManageMembers ||
    context.canReadBank ||
    context.canManageGames
  ) {
    return true;
  }
  if (target.meepleId && target.meepleId === context.currentMeepleId) {
    return true;
  }
  return context.isGuardianOfTarget;
}

/** Enger als `canAccessMemberProfile` (#381) — der Bankverbindungs-Bereich
 * ist bewusst nicht für jeden mit Seitenzugriff sichtbar: ein Spielewart
 * (`games:manage`) darf die Profilseite öffnen, aber keine Bankdaten sehen.
 * Nicht `isAdmin`: `admin:access` allein ist keine der im Issue genannten
 * Berechtigungen für diesen Bereich. */
export function canViewBankSection(
  target: { meepleId: string | null },
  context: ProfileViewerContext,
): boolean {
  if (context.canReadBank || context.canManageMembers) return true;
  return !!target.meepleId && target.meepleId === context.currentMeepleId;
}

/** Lädt alle für `canAccessMemberProfile` und die Bereichs-Sichtbarkeit
 * (#380 ff.) nötigen Berechtigungen für die aktuelle Session, bezogen auf
 * genau einen Ziel-`Member`. */
export async function loadProfileViewerContext(
  session: { user: { id: string }; meeple: { id: string } },
  targetMemberId: string,
): Promise<ProfileViewerContext> {
  const [isAdmin, canManageMembers, canReadBank, canManageGames, ownMember] =
    await Promise.all([
      hasPermission(session.user.id, "admin:access"),
      hasPermission(session.user.id, "members:manage"),
      hasPermission(session.user.id, "bank:read"),
      hasPermission(session.user.id, "games:manage"),
      prisma.member.findUnique({
        where: { meepleId: session.meeple.id },
        select: { id: true },
      }),
    ]);

  const isGuardianOfTarget = ownMember
    ? await isGuardianOf(ownMember.id, targetMemberId)
    : false;

  return {
    currentMeepleId: session.meeple.id,
    currentMemberId: ownMember?.id ?? null,
    isAdmin,
    canManageMembers,
    canReadBank,
    canManageGames,
    isGuardianOfTarget,
  };
}

/** Fields both `/profil` (eigenes Profil, `where: {meepleId}`) und
 * `/profil/[slug]` (fremdes Profil, `where: {slug}`) für die
 * `MitgliedProfilView` brauchen — an einer Stelle gepflegt, damit beide
 * Routen dieselbe Member-Form laden. */
const MEMBER_PROFILE_INCLUDE = {
  meeple: {
    select: {
      id: true,
      displayName: true,
      bggUsername: true,
      bgaUsername: true,
      telegramHandle: true,
      signalHandle: true,
      discordHandle: true,
      address: true,
      shareAddress: true,
      doorbellNote: true,
      neonAuthUserId: true,
      privateCollectionVisible: true,
      privateCollectionSyncedAt: true,
      profilePictureUrl: true,
      profilePictureVisibility: true,
      meepleDatenVisibility: true,
    },
  },
} satisfies Prisma.MemberInclude;

/** Lädt `Member` + Zugriffskontext für `/profil`/`/profil/[slug]` und prüft
 * `canAccessMemberProfile` gleich mit — `null`, wenn der Member nicht
 * existiert oder die Session keinen Zugriff hat (beides führt im Aufrufer
 * zu `notFound()`, unterscheidet sich für die Anzeige nicht). */
export async function loadMemberProfileData(
  session: Parameters<typeof loadProfileViewerContext>[0],
  where: Prisma.MemberWhereUniqueInput,
) {
  const member = await prisma.member.findUnique({
    where,
    include: MEMBER_PROFILE_INCLUDE,
  });
  if (!member) return null;

  const viewer = await loadProfileViewerContext(session, member.id);
  if (!canAccessMemberProfile(member, viewer)) return null;

  return { member, viewer };
}
