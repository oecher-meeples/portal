import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getMembershipState } from "@/lib/meeples";
import { AdminMitgliederView } from "@/components/feature/admin-mitglieder/admin-mitglieder-view";

export default async function AdminMitgliederPage() {
  await requireAdmin();

  const [meeples, userRoles, gameHoldingCounts, storageUnitCounts] =
    await Promise.all([
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

  const now = new Date();

  return (
    <AdminMitgliederView
      isDecemberOrLater={now.getUTCMonth() === 11}
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
    />
  );
}
