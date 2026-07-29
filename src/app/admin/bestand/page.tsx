import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { zustandFromHoldingAndUnit } from "@/lib/ludothek/holdings";
import { boardGameAdminWhere } from "@/components/feature/admin-bestand/filters";
import {
  AdminBestandView,
  type AdminBoardGameRow,
} from "@/components/feature/admin-bestand/admin-bestand-view";

const dateFormatter = new Intl.DateTimeFormat("de-DE");

function locationChain(
  unitId: string,
  unitById: Map<string, { label: string; parentUnitId: string | null }>,
) {
  const chain: string[] = [];
  let currentId: string | null = unitId;
  let depth = 0;
  while (currentId && depth < 20) {
    const unit = unitById.get(currentId);
    if (!unit) break;
    chain.push(unit.label);
    currentId = unit.parentUnitId;
    depth += 1;
  }
  return chain.reverse().join(" → ");
}

export default async function AdminBestandPage({
  searchParams,
}: {
  searchParams: Promise<{ deinventarisiert?: string; ean?: string }>;
}) {
  await requireAdmin();
  const { deinventarisiert, ean } = await searchParams;
  const showDeinventarised = deinventarisiert === "1";

  const [games, units] = await Promise.all([
    prisma.boardGame.findMany({
      where: boardGameAdminWhere({ showDeinventarised }),
      orderBy: { title: "asc" },
      include: {
        holdings: {
          where: { endedAt: null },
          include: { unit: true, meeple: { select: { displayName: true } } },
        },
      },
    }),
    prisma.storageUnit.findMany({
      select: { id: true, label: true, parentUnitId: true },
    }),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));

  const rows: AdminBoardGameRow[] = games.map((game) => {
    const holding = game.holdings[0] ?? null;
    const zustand = holding
      ? zustandFromHoldingAndUnit(holding, holding.unit, game.status)
      : "nicht-erfasst";

    return {
      id: game.id,
      title: game.title,
      ean: game.ean,
      status: game.status,
      needsCompletenessCheck: game.needsCompletenessCheck,
      lastCheckedAt: game.lastCheckedAt
        ? dateFormatter.format(game.lastCheckedAt)
        : null,
      archivedReason: game.archivedReason,
      zustand,
      locationChain: holding?.meepleId
        ? `bei ${holding.meeple?.displayName ?? "Meeple"}`
        : holding?.unitId
          ? locationChain(holding.unitId, unitById)
          : "",
    };
  });

  return (
    <AdminBestandView
      games={rows}
      showDeinventarised={showDeinventarised}
      defaultEan={ean}
    />
  );
}
