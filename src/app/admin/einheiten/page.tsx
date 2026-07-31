import { redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/server";
import { ensureMeeple, getMembershipState } from "@/lib/members/meeples";
import {
  AdminEinheitenView,
  type ResignedHolderRow,
  type StorageUnitRow,
} from "@/components/feature/admin-einheiten/admin-einheiten-view";

function locationChain(
  unit: { label: string; parentUnitId: string | null },
  byId: Map<string, { label: string; parentUnitId: string | null }>,
) {
  const chain = [unit.label];
  let parentId = unit.parentUnitId;
  let depth = 0;
  while (parentId && depth < 20) {
    const parent = byId.get(parentId);
    if (!parent) break;
    chain.push(parent.label);
    parentId = parent.parentUnitId;
    depth += 1;
  }
  return chain.reverse().join(" → ");
}

export default async function AdminEinheitenPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const [currentMeeple, isAdmin] = await Promise.all([
    ensureMeeple(user),
    hasPermission(user.id, "games:manage"),
  ]);

  const [units, gameCounts, meeples] = await Promise.all([
    prisma.storageUnit.findMany({
      orderBy: { code: "asc" },
      include: { keeper: { select: { displayName: true } } },
    }),
    prisma.gameHolding.groupBy({
      by: ["unitId"],
      where: { endedAt: null, unitId: { not: null } },
      _count: { _all: true },
    }),
    prisma.meeple.findMany(),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const gameCountByUnitId = new Map(
    gameCounts.map((row) => [row.unitId!, row._count._all]),
  );

  const resignedMeeples = meeples.filter(
    (m) => getMembershipState(m) === "ausgetreten",
  );

  const [openHoldingsAll, unitsWithKeeper] = await Promise.all([
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

  const resignedHolders: ResignedHolderRow[] = resignedMeeples
    .map((meeple) => {
      const gameCount =
        openHoldingsAll.find((r) => r.meepleId === meeple.id)?._count._all ?? 0;
      const unitCount =
        unitsWithKeeper.find((r) => r.keeperMeepleId === meeple.id)?._count
          ._all ?? 0;
      return { meepleName: meeple.displayName, gameCount, unitCount };
    })
    .filter((holder) => holder.gameCount > 0 || holder.unitCount > 0);

  const rows: StorageUnitRow[] = units.map((unit) => ({
    id: unit.id,
    code: unit.code,
    kind: unit.kind,
    label: unit.label,
    locationChain: locationChain(unit, unitById),
    keeperMeepleId: unit.keeperMeepleId,
    keeperName: unit.keeper?.displayName ?? null,
    gameCount: gameCountByUnitId.get(unit.id) ?? 0,
    retired: unit.retiredAt !== null,
  }));

  const keeperOptions = meeples
    .filter((m) => getMembershipState(m) !== "anonymisiert")
    .map((m) => ({ id: m.id, displayName: m.displayName }));

  return (
    <AdminEinheitenView
      units={rows}
      resignedHolders={resignedHolders}
      isAdmin={isAdmin}
      selfMeepleId={currentMeeple.id}
      keeperOptions={keeperOptions}
    />
  );
}
