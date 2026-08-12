import { prisma } from "@/lib/utils/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { getMembershipState } from "@/lib/members/meeples";
import { AdminMitgliederView } from "@/components/feature/admin-mitglieder/admin-mitglieder-view";
import { listPendingDeletionRequests } from "@/lib/members/deletion-requests";
import { listInvites } from "@/lib/members/invites";

export default async function AdminMitgliederPage() {
  await requireAdmin();

  const now = new Date();

  const [
    meeples,
    userRoles,
    gameHoldingCounts,
    storageUnitCounts,
    deletionRequests,
    invites,
  ] = await Promise.all([
    prisma.meeple.findMany({ orderBy: { memberNumber: "asc" } }),
    prisma.userRole.findMany({ include: { role: true } }),
    prisma.gameHolding.groupBy({
      by: ["meepleId"],
      where: { endedAt: null, meepleId: { not: null } },
      _count: { _all: true },
    }),
    prisma.storageUnit.groupBy({
      by: ["keeperMeepleId"],
      where: { retiredAt: null, keeperMeepleId: { not: null } },
      _count: { _all: true },
    }),
    listPendingDeletionRequests(now),
    listInvites(now),
  ]);

  const rolesByUserId = new Map<string, string[]>();
  for (const userRole of userRoles) {
    const list = rolesByUserId.get(userRole.neonAuthUserId) ?? [];
    list.push(userRole.role.name);
    rolesByUserId.set(userRole.neonAuthUserId, list);
  }

  const openGamesByMeepleId = new Map(
    gameHoldingCounts.map((row) => [row.meepleId!, row._count._all]),
  );
  const openUnitsByMeepleId = new Map(
    storageUnitCounts.map((row) => [row.keeperMeepleId!, row._count._all]),
  );

  return (
    <AdminMitgliederView
      isDecemberOrLater={now.getUTCMonth() === 11}
      deletionRequests={deletionRequests.map((request) => ({
        id: request.id,
        meepleId: request.meepleId,
        displayName: request.displayName,
        requestedAt: request.requestedAt.toISOString(),
        deadlineAt: request.deadlineAt.toISOString(),
        daysRemaining: request.daysRemaining,
        overdue: request.overdue,
      }))}
      meeples={meeples.map((meeple) => ({
        id: meeple.id,
        memberNumber: meeple.memberNumber,
        displayName: meeple.displayName,
        roles: meeple.neonAuthUserId
          ? (rolesByUserId.get(meeple.neonAuthUserId) ?? [])
          : [],
        membershipState: getMembershipState(meeple, now),
        joinedAt: meeple.joinedAt.toISOString(),
        resignedAt: meeple.resignedAt?.toISOString() ?? null,
        membershipEndsAt: meeple.membershipEndsAt?.toISOString() ?? null,
        openGames: openGamesByMeepleId.get(meeple.id) ?? 0,
        openUnits: openUnitsByMeepleId.get(meeple.id) ?? 0,
      }))}
      invites={invites.map((invite) => ({
        id: invite.id,
        token: invite.token,
        email: invite.email,
        createdByDisplayName: invite.createdByDisplayName,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt.toISOString(),
        redeemedAt: invite.redeemedAt?.toISOString() ?? null,
        status: invite.status,
      }))}
    />
  );
}
