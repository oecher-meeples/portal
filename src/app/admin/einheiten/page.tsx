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
    // EVENT-Units sind system-verwaltet (lazy per `ensureEventUnit()`, #273)
    // und gehören nicht in die manuelle Karton/Regal-Verwaltung hier.
    prisma.storageUnit.findMany({
      where: { kind: { not: "EVENT" } },
      orderBy: { code: "asc" },
      include: { keeper: { select: { displayName: true } } },
    }),
    prisma.gameHolding.groupBy({
      by: ["unitId"],
      where: { endedAt: null, unitId: { not: null } },
      _count: { _all: true },
    }),
    prisma.meeple.findMany({
      include: {
        member: {
          select: { id: true, resignedAt: true, membershipEndsAt: true },
        },
      },
    }),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const gameCountByUnitId = new Map(
    gameCounts.map((row) => [row.unitId!, row._count._all]),
  );

  function membershipStateOf(meeple: (typeof meeples)[number]) {
    return getMembershipState({
      resignedAt: meeple.member?.resignedAt ?? null,
      membershipEndsAt: meeple.member?.membershipEndsAt ?? null,
      anonymizedAt: meeple.anonymizedAt,
    });
  }

  const resignedMeeples = meeples.filter(
    (m) => membershipStateOf(m) === "ausgetreten",
  );

  const [openHoldingsAll, unitsWithKeeper] = await Promise.all([
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
  ]);

  const resignedHolders: ResignedHolderRow[] = resignedMeeples
    .map((meeple) => {
      const gameCount = meeple.member
        ? (openHoldingsAll.find(
            (r) => r.vereinsmitgliedId === meeple.member!.id,
          )?._count._all ?? 0)
        : 0;
      const unitCount =
        unitsWithKeeper.find((r) => r.keeperMeepleId === meeple.id)?._count
          ._all ?? 0;
      return { meepleName: meeple.displayName, gameCount, unitCount };
    })
    .filter((holder) => holder.gameCount > 0 || holder.unitCount > 0);

  const rows: StorageUnitRow[] = units.map((unit) => ({
    id: unit.id,
    code: unit.code,
    // Die Query oben filtert EVENT-Units bereits aus — Prisma engt den
    // Rückgabetyp dadurch nicht automatisch ein (#273).
    kind: unit.kind as "BOX" | "SHELF",
    label: unit.label,
    locationChain: locationChain(unit, unitById),
    keeperMeepleId: unit.keeperMeepleId,
    keeperName: unit.keeper?.displayName ?? null,
    gameCount: gameCountByUnitId.get(unit.id) ?? 0,
    retired: unit.retiredAt !== null,
  }));

  const keeperOptions = meeples
    .filter((m) => membershipStateOf(m) !== "anonymisiert")
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
