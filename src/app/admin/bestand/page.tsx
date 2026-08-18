import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { zustandFromHoldingAndUnit } from "@/lib/ludothek/holdings";
import {
  formatLocationChain,
  walkUnitChain,
} from "@/lib/ludothek/holdings-lookup";
import { gameCopyAdminWhere } from "@/components/feature/admin-bestand/filters";
import {
  AdminBestandView,
  type AdminBoardGameRow,
} from "@/components/feature/admin-bestand/admin-bestand-view";
import { formatDatePlain } from "@/lib/utils/format";

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
        boardGame: { include: { alternateNames: { select: { name: true } } } },
        holdings: {
          where: { endedAt: null },
          include: { unit: true, meeple: { select: { displayName: true } } },
        },
      },
    }),
    prisma.storageUnit.findMany({
      select: {
        id: true,
        label: true,
        parentUnitId: true,
        keeperMeepleId: true,
      },
    }),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const keeperIds = [
    ...new Set(
      units
        .map((u) => u.keeperMeepleId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const keepers = keeperIds.length
    ? await prisma.meeple.findMany({
        where: { id: { in: keeperIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const keeperNameById = new Map(keepers.map((k) => [k.id, k.displayName]));

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
      secondaryTitle: boardGame.secondaryTitle,
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
      kind: boardGame.kind,
      explainerVideoUrl: boardGame.explainerVideoUrl,
      alternateNames: boardGame.alternateNames.map((a) => a.name),
      locationChain: (() => {
        if (holding?.meepleId) {
          return formatLocationChain({
            responsibleName: holding.meeple?.displayName ?? "Meeple",
            unitChain: "",
          });
        }
        if (!holding?.unitId) return "";
        const { unitChain, keeperMeepleId } = walkUnitChain(
          holding.unitId,
          unitById,
        );
        return formatLocationChain({
          responsibleName: keeperMeepleId
            ? (keeperNameById.get(keeperMeepleId) ?? null)
            : null,
          unitChain,
        });
      })(),
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
