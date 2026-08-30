import { prisma } from "@/lib/utils/prisma";
import { requireAdminPermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { MITGLIEDER_PERMISSIONS } from "@/lib/utils/nav-config";
import { getMembershipState } from "@/lib/members/meeples";
import { maskIban } from "@/lib/utils/crypto";
import { AdminMitgliederView } from "@/components/feature/admin-mitglieder/admin-mitglieder-view";
import { listPendingDeletionRequests } from "@/lib/members/deletion-requests";
import { listInvites } from "@/lib/members/invites";
import { listMembersWithoutLogin } from "@/lib/members/members-without-login";
import { getDefaultInviteDays } from "@/lib/members/invite-settings";
import { listOpenPendingChanges } from "@/lib/members/pending-changes";
import { memberDisplayName } from "@/lib/members/member-display-name";
import { listMembersEligibleForStufe3 } from "@/lib/members/anonymisation";
import { determineContribution } from "@/lib/members/contribution";
import { PendingChangeKind } from "@prisma/client";

export default async function AdminMitgliederPage() {
  const session = await requireAdminPermission(MITGLIEDER_PERMISSIONS);

  const now = new Date();

  const [
    members,
    meeples,
    userRoles,
    roles,
    permissions,
    gameHoldingCounts,
    storageUnitCounts,
    deletionRequests,
    invites,
    membersWithoutLogin,
    defaultInviteDays,
    pendingChanges,
    stufe3Candidates,
    canReadBankData,
    canManageRoles,
    canCreateSystemkonto,
  ] = await Promise.all([
    prisma.member.findMany({
      orderBy: { memberNumber: "asc" },
      include: {
        meeple: {
          select: {
            id: true,
            displayName: true,
            joinedAt: true,
            anonymizedAt: true,
          },
        },
      },
    }),
    prisma.meeple.findMany({
      orderBy: { memberNumber: "asc" },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            resignedAt: true,
            membershipEndsAt: true,
            accountHolder: true,
            ibanEncrypted: true,
            ibanLast4: true,
          },
        },
      },
    }),
    prisma.userRole.findMany({
      include: { role: { select: { id: true, name: true } } },
      orderBy: { startsAt: "desc" },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { permissions: true },
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" } }),
    prisma.gameHolding.groupBy({
      by: ["vereinsmitgliedId"],
      where: { endedAt: null, vereinsmitgliedId: { not: null } },
      _count: { _all: true },
    }),
    prisma.storageUnit.groupBy({
      by: ["keeperMeepleId"],
      where: { retiredAt: null, keeperMeepleId: { not: null } },
      _count: { _all: true },
    }),
    listPendingDeletionRequests(now),
    listInvites(now),
    listMembersWithoutLogin(),
    getDefaultInviteDays(),
    listOpenPendingChanges(),
    listMembersEligibleForStufe3(now),
    hasPermission(session.user.id, "bank:read"),
    hasPermission(session.user.id, "members:manage"),
    hasPermission(session.user.id, "admin:access"),
  ]);

  // A Meeple can hold several roles at once (#335), each with its own
  // (possibly expired, #264) time window — group all assignments per user.
  const roleAssignmentsByUserId = new Map<
    string,
    {
      id: string;
      roleId: string;
      roleName: string;
      startsAt: Date;
      endsAt: Date | null;
    }[]
  >();
  for (const userRole of userRoles) {
    const list = roleAssignmentsByUserId.get(userRole.neonAuthUserId) ?? [];
    list.push({
      id: userRole.id,
      roleId: userRole.roleId,
      roleName: userRole.role.name,
      startsAt: userRole.startsAt,
      endsAt: userRole.endsAt,
    });
    roleAssignmentsByUserId.set(userRole.neonAuthUserId, list);
  }

  const openGamesByVereinsmitgliedId = new Map(
    gameHoldingCounts.map((row) => [row.vereinsmitgliedId!, row._count._all]),
  );
  const openUnitsByMeepleId = new Map(
    storageUnitCounts.map((row) => [row.keeperMeepleId!, row._count._all]),
  );
  const stufe3EligibleIds = new Set(stufe3Candidates.map((m) => m.id));

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
      members={members.map((member) => ({
        id: member.id,
        memberNumber: member.memberNumber,
        displayName: memberDisplayName(member),
        email: member.email,
        meepleId: member.meepleId,
        joinedAt: member.meeple?.joinedAt.toISOString() ?? null,
        resignedAt: member.resignedAt?.toISOString() ?? null,
        membershipEndsAt: member.membershipEndsAt?.toISOString() ?? null,
        membershipState: getMembershipState(
          {
            resignedAt: member.resignedAt,
            membershipEndsAt: member.membershipEndsAt,
            anonymizedAt: member.meeple?.anonymizedAt ?? null,
          },
          now,
        ),
        contributionCategory: determineContribution(member, now).category,
        openGames: openGamesByVereinsmitgliedId.get(member.id) ?? 0,
        openUnits: member.meepleId
          ? (openUnitsByMeepleId.get(member.meepleId) ?? 0)
          : 0,
        stufe3Eligible: stufe3EligibleIds.has(member.id),
      }))}
      meeples={meeples.map((meeple) => ({
        id: meeple.id,
        memberNumber: meeple.memberNumber,
        displayName: meeple.displayName,
        email: meeple.member?.email ?? null,
        hasAccount: meeple.neonAuthUserId !== null,
        roleAssignments: (meeple.neonAuthUserId
          ? (roleAssignmentsByUserId.get(meeple.neonAuthUserId) ?? [])
          : []
        ).map((a) => ({
          id: a.id,
          roleId: a.roleId,
          roleName: a.roleName,
          startsAt: a.startsAt.toISOString(),
          endsAt: a.endsAt?.toISOString() ?? null,
        })),
        membershipState: getMembershipState(
          {
            resignedAt: meeple.member?.resignedAt ?? null,
            membershipEndsAt: meeple.member?.membershipEndsAt ?? null,
            anonymizedAt: meeple.anonymizedAt,
          },
          now,
        ),
        joinedAt: meeple.joinedAt.toISOString(),
        resignedAt: meeple.member?.resignedAt?.toISOString() ?? null,
        membershipEndsAt:
          meeple.member?.membershipEndsAt?.toISOString() ?? null,
        openGames: meeple.member
          ? (openGamesByVereinsmitgliedId.get(meeple.member.id) ?? 0)
          : 0,
        openUnits: openUnitsByMeepleId.get(meeple.id) ?? 0,
        accountHolder: meeple.member?.accountHolder ?? null,
        maskedIban: maskIban(meeple.member?.ibanLast4 ?? null),
        hasIban: (meeple.member?.ibanEncrypted ?? null) !== null,
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
      membersWithoutLogin={membersWithoutLogin}
      defaultInviteDays={defaultInviteDays}
      canCreateSystemkonto={canCreateSystemkonto}
      pendingEmailChanges={pendingChanges
        .filter((change) => change.kind === PendingChangeKind.MEMBER_EMAIL)
        .map((change) => ({
          id: change.id,
          memberDisplayName: memberDisplayName(change.member),
          memberNumber: change.member.memberNumber,
          displayValue: change.newValue,
          requestedAt: change.requestedAt.toISOString(),
          confirmed: change.confirmedAt !== null,
        }))}
      stufe3Candidates={stufe3Candidates.map((member) => ({
        id: member.id,
        memberNumber: member.memberNumber,
        displayName: memberDisplayName(member),
        membershipEndsAt: member.membershipEndsAt!.toISOString(),
      }))}
    />
  );
}
