import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { zustandFromHoldingAndUnit } from "@/lib/ludothek/holdings";
import { gameCopyAdminWhere } from "@/components/feature/admin-bestand/filters";
import {
  AdminBestandView,
  type AdminBoardGameRow,
} from "@/components/feature/admin-bestand/admin-bestand-view";
import { formatDatePlain } from "@/lib/utils/format";

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

  const [copies, units] = await Promise.all([
    prisma.gameCopy.findMany({
      where: gameCopyAdminWhere({ showDeinventarised }),
      orderBy: { boardGame: { title: "asc" } },
      include: {
        boardGame: true,
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

  const rows: AdminBoardGameRow[] = copies.map((copy) => {
    const holding = copy.holdings[0] ?? null;
    const zustand = holding
      ? zustandFromHoldingAndUnit(holding, holding.unit, copy.status)
      : "nicht-erfasst";
    const boardGame = copy.boardGame;

    return {
      id: copy.id,
      boardGameId: boardGame.id,
      title: boardGame.title,
      ean: boardGame.ean,
      status: copy.status,
      needsCompletenessCheck: copy.needsCompletenessCheck,
      lastCheckedAt: copy.lastCheckedAt
        ? formatDatePlain(copy.lastCheckedAt)
        : null,
      archivedReason: copy.archivedReason,
      zustand,
      bggId: boardGame.bggId,
      minPlayers: boardGame.minPlayers,
      maxPlayers: boardGame.maxPlayers,
      playTimeMinutes: boardGame.playTimeMinutes,
      weight: boardGame.weight,
      imageUrl: boardGame.imageUrl,
      description: boardGame.description,
      mechanics: boardGame.mechanics,
      condition: copy.condition,
      explainerVideoUrl: boardGame.explainerVideoUrl,
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
