import { prisma } from "@/lib/utils/prisma";
import { requireAdminPermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { MITGLIEDER_PERMISSIONS } from "@/lib/utils/nav-config";
import { getMembershipState } from "@/lib/members/meeples";
import { maskIban } from "@/lib/utils/crypto";
import { AdminMitgliederView } from "@/components/feature/admin-mitglieder/admin-mitglieder-view";
import { listPendingDeletionRequests } from "@/lib/members/deletion-requests";
import { listInvites } from "@/lib/members/invites";

export default async function AdminMitgliederPage() {
  const session = await requireAdminPermission(MITGLIEDER_PERMISSIONS);

  const now = new Date();

  const [
    meeples,
    userRoles,
    roles,
    permissions,
    gameHoldingCounts,
    storageUnitCounts,
    deletionRequests,
    invites,
    canReadBankData,
    canManageRoles,
  ] = await Promise.all([
    prisma.meeple.findMany({ orderBy: { memberNumber: "asc" } }),
    prisma.userRole.findMany({ include: { role: true } }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { permissions: true },
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" } }),
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
    hasPermission(session.user.id, "bank:read"),
    hasPermission(session.user.id, "members:manage"),
  ]);

  // A Meeple holds exactly one role (see redeemInvite's DEFAULT_ROLE) — the
  // first match is enough even if a data inconsistency left more than one.
  const roleIdByUserId = new Map<string, string>();
  for (const userRole of userRoles) {
    if (!roleIdByUserId.has(userRole.neonAuthUserId)) {
      roleIdByUserId.set(userRole.neonAuthUserId, userRole.roleId);
    }
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
      roles={roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissionIds: role.permissions.map((entry) => entry.permissionId),
      }))}
      permissions={permissions.map((permission) => ({
        id: permission.id,
        key: permission.key,
        description: permission.description,
      }))}
      canManageRoles={canManageRoles}
      canReadBankData={canReadBankData}
      meeples={meeples.map((meeple) => ({
        id: meeple.id,
        memberNumber: meeple.memberNumber,
        displayName: meeple.displayName,
        email: meeple.email,
        hasAccount: meeple.neonAuthUserId !== null,
        roleId: meeple.neonAuthUserId
          ? (roleIdByUserId.get(meeple.neonAuthUserId) ?? null)
          : null,
        membershipState: getMembershipState(meeple, now),
        joinedAt: meeple.joinedAt.toISOString(),
        resignedAt: meeple.resignedAt?.toISOString() ?? null,
        membershipEndsAt: meeple.membershipEndsAt?.toISOString() ?? null,
        openGames: openGamesByMeepleId.get(meeple.id) ?? 0,
        openUnits: openUnitsByMeepleId.get(meeple.id) ?? 0,
        accountHolder: meeple.accountHolder,
        maskedIban: maskIban(meeple.ibanLast4),
        hasIban: meeple.ibanEncrypted !== null,
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
