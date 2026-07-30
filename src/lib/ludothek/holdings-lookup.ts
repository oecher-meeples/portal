import {
  GameInventoryStatus,
  StorageUnitKind,
  type BoardGame,
  type GameHolding,
  type Prisma,
  type PrismaClient,
  type StorageUnit,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { UNSORTIERT_CODE, parseScannedCode } from "@/lib/inventory/codes";
import { HoldingConflictError } from "@/lib/ludothek/errors";

type Tx = PrismaClient | Prisma.TransactionClient;

const MAX_UNIT_CHAIN_DEPTH = 20;

export type GameZustand = "frei" | "ausgeliehen" | "wartung" | "nicht-erfasst";

/** The unit for games whose physical location has never been recorded (see CONTEXT.md). */
export async function ensureUnsortiertUnit(tx: Tx = prisma) {
  return tx.storageUnit.upsert({
    where: { code: UNSORTIERT_CODE },
    update: {},
    create: {
      code: UNSORTIERT_CODE,
      kind: StorageUnitKind.BOX,
      label: "Unsortiert",
    },
  });
}

export type ResolvedScan =
  | { kind: "games"; games: BoardGame[] }
  | { kind: "unit"; unit: StorageUnit; contents: BoardGame[] }
  | { kind: "unknown"; raw: string };

export async function resolveScannedCode(raw: string): Promise<ResolvedScan> {
  const parsed = parseScannedCode(raw);

  if (parsed.kind === "unit") {
    const unit = await prisma.storageUnit.findUnique({
      where: { code: parsed.value },
    });
    if (!unit) {
      return { kind: "unknown", raw };
    }
    const contents = await prisma.boardGame.findMany({
      where: { holdings: { some: { unitId: unit.id, endedAt: null } } },
    });
    return { kind: "unit", unit, contents };
  }

  if (parsed.kind === "ean") {
    const games = await prisma.boardGame.findMany({
      where: {
        ean: parsed.value,
        status: { not: GameInventoryStatus.DEINVENTARISED },
      },
    });
    if (games.length === 0) {
      return { kind: "unknown", raw };
    }
    return { kind: "games", games };
  }

  return { kind: "unknown", raw };
}

/** Walks Spiel → Karton → Regal → Meeple, stopping at the first keeper found. */
export async function getResponsibleMeeple(
  game: Pick<BoardGame, "id">,
): Promise<string | null> {
  const holding = await prisma.gameHolding.findFirst({
    where: { boardGameId: game.id, endedAt: null },
  });
  if (!holding) return null;
  if (holding.meepleId) return holding.meepleId;
  if (!holding.unitId) return null;

  let unitId: string | null = holding.unitId;
  for (let depth = 0; unitId && depth < MAX_UNIT_CHAIN_DEPTH; depth++) {
    const unit: StorageUnit | null = await prisma.storageUnit.findUnique({
      where: { id: unitId },
    });
    if (!unit) return null;
    if (unit.keeperMeepleId) return unit.keeperMeepleId;
    unitId = unit.parentUnitId;
  }

  return null;
}

/** Pure so bulk views (e.g. admin-bestand) can reuse it without a query per game. */
export function zustandFromHoldingAndUnit(
  holding: Pick<GameHolding, "meepleId">,
  unit: Pick<StorageUnit, "code"> | null,
  gameStatus: GameInventoryStatus,
): GameZustand {
  if (holding.meepleId) return "ausgeliehen";
  if (unit?.code === UNSORTIERT_CODE) return "nicht-erfasst";
  if (gameStatus === GameInventoryStatus.MAINTENANCE) return "wartung";
  return "frei";
}

export async function getGameZustand(
  game: Pick<BoardGame, "id" | "status">,
): Promise<GameZustand> {
  const holding = await prisma.gameHolding.findFirst({
    where: { boardGameId: game.id, endedAt: null },
    include: { unit: true },
  });

  if (!holding) {
    throw new HoldingConflictError(
      `Spiel ${game.id} hat keinen offenen Aufenthalt — das darf laut Datenmodell nicht vorkommen.`,
    );
  }
  return zustandFromHoldingAndUnit(holding, holding.unit, game.status);
}
