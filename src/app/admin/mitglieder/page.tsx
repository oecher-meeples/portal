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
import { buildVereinsmitgliedRows } from "@/lib/members/vereinsmitglieder-rows";
import { ANONYMER_MEEPLE_NAME } from "@/lib/ludothek/anonymer-meeple";
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
    canManageMembers,
    canManageRoles,
    canManageInvites,
    canCreateSystemkonto,
    canManageSystemAccounts,
  ] = await Promise.all([
    prisma.member.findMany({
      orderBy: { memberNumber: "asc" },
      include: {
        meeple: {
          select: {
            id: true,
            displayName: true,
            anonymizedAt: true,
            neonAuthUserId: true,
            isSystemAccount: true,
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
            firstName: true,
            lastName: true,
            email: true,
            resignedAt: true,
            membershipEndsAt: true,
            accountHolder: true,
            ibanEncrypted: true,
            ibanFirst2: true,
            ibanLast4: true,
          },
        },
      },
    }),
    prisma.userRole.findMany({
      include: { role: { select: { id: true, name: true } } },
      // #391: kanonische Rollen-Reihenfolge statt Zuweisungsdatum, damit
      // die Badges in mitglieder-table.tsx überall gleich sortiert erscheinen.
      orderBy: { role: { sortOrder: "asc" } },
    }),
    prisma.role.findMany({
      orderBy: { sortOrder: "asc" },
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
    hasPermission(session.user.id, "roles:manage"),
    hasPermission(session.user.id, "invites:manage"),
    hasPermission(session.user.id, "admin:access"),
    hasPermission(session.user.id, "members:manage-system-accounts"),
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
  const openInviteTokenByEmail = new Map(
    invites
      .filter((invite) => invite.status === "offen")
      .map((invite) => [invite.email, invite.token]),
  );

  const vereinsmitgliedRows = buildVereinsmitgliedRows(
    members,
    {
      openGamesByMemberId: openGamesByVereinsmitgliedId,
      openUnitsByMeepleId,
      stufe3EligibleIds,
      openInviteTokenByEmail,
    },
    now,
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
        isSystemRole: role.isSystemRole,
        sortOrder: role.sortOrder,
      }))}
      permissions={permissions.map((permission) => ({
        id: permission.id,
        key: permission.key,
        description: permission.description,
      }))}
      canManageMembers={canManageMembers}
      canManageRoles={canManageRoles}
      canManageInvites={canManageInvites}
      canReadBankData={canReadBankData}
      members={vereinsmitgliedRows}
      meeples={meeples.map((meeple) => ({
        id: meeple.id,
        memberNumber: meeple.memberNumber,
        displayName: meeple.displayName,
        // Systemkonten (`createSystemkonto()`) haben laut Datenmodell nie
        // ein `Member` — `member` ist für sie bereits `null`. Das Sammelkonto
        // "Anonymer Meeple" hat zwar eine `Member`-Zeile (Pflicht-FK von
        // `GameHolding.vereinsmitgliedId`), wird aber aus der
        // Vereinsmitglieder-Tabelle ausgeschlossen (`buildVereinsmitgliedRows`)
        // — ein Link dorthin würde ins Leere laufen, deshalb hier zusätzlich
        // explizit ausgenommen.
        memberId:
          meeple.displayName === ANONYMER_MEEPLE_NAME
            ? null
            : (meeple.member?.id ?? null),
        // Voller Name des verknüpften Vereinsmitglieds (Vorname/Nachname) —
        // getrennt vom Meeple-`displayName` (frei wählbarer Portal-Name,
        // kann vom bürgerlichen Namen abweichen). `null`, wenn (noch) keins
        // gepflegt ist (#328: nullable, nicht bei jedem Bestand befüllt).
        memberFullName:
          [meeple.member?.firstName, meeple.member?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || null,
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
            meepleId: meeple.id,
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
        maskedIban: maskIban(
          meeple.member?.ibanFirst2 ?? null,
          meeple.member?.ibanLast4 ?? null,
        ),
        hasIban: (meeple.member?.ibanEncrypted ?? null) !== null,
        isSystemAccount: meeple.isSystemAccount,
      }))}
      canManageSystemAccounts={canManageSystemAccounts}
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
