import {
  GameInventoryStatus,
  StorageUnitKind,
  type BoardGame,
  type GameCopy,
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

export type UnitChainNode = {
  label: string;
  parentUnitId: string | null;
  keeperMeepleId: string | null;
};

/** Walks a unit chain from a leaf up towards the root, stopping at the first
 * keeper found — that person is the pickup orientation point, further
 * ancestor units aren't shown (see #121 Standort-Kette). */
export function walkUnitChain(
  unitId: string,
  unitById: Map<string, UnitChainNode>,
) {
  const labels: string[] = [];
  let keeperMeepleId: string | null = null;
  let currentId: string | null = unitId;
  let depth = 0;

  while (currentId && depth < MAX_UNIT_CHAIN_DEPTH) {
    const unit = unitById.get(currentId);
    if (!unit) break;
    labels.push(unit.label);
    if (unit.keeperMeepleId) {
      keeperMeepleId = unit.keeperMeepleId;
      break;
    }
    currentId = unit.parentUnitId;
    depth += 1;
  }

  return { unitChain: labels.reverse().join(" → "), keeperMeepleId };
}

/** The one place that decides the display order: person/event first (the
 * pickup orientation point), then the storage units (see #121). */
export function formatLocationChain({
  responsibleName,
  unitChain,
}: {
  responsibleName: string | null;
  unitChain: string;
}) {
  if (!responsibleName) return unitChain;
  return unitChain
    ? `bei ${responsibleName} → ${unitChain}`
    : `bei ${responsibleName}`;
}

/** A physical copy together with its title — what a scan actually resolves to. */
export type ScannedGameCopy = GameCopy & { boardGame: BoardGame };

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
  | { kind: "games"; games: ScannedGameCopy[] }
  | { kind: "unit"; unit: StorageUnit; contents: ScannedGameCopy[] }
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
    const contents = await prisma.gameCopy.findMany({
      where: { holdings: { some: { unitId: unit.id, endedAt: null } } },
      include: { boardGame: true },
    });
    return { kind: "unit", unit, contents };
  }

  if (parsed.kind === "ean") {
    // The EAN identifies the title, not the individual copy (ADR 0001/0008) —
    // a scan can resolve to several copies of the same title.
    const copies = await prisma.gameCopy.findMany({
      where: {
        boardGame: { ean: parsed.value },
        status: { not: GameInventoryStatus.DEINVENTARISED },
      },
      include: { boardGame: true },
    });
    if (copies.length === 0) {
      return { kind: "unknown", raw };
    }
    return { kind: "games", games: copies };
  }

  return { kind: "unknown", raw };
}

/** Walks Exemplar → Karton → Regal → Meeple, stopping at the first keeper found. */
export async function getResponsibleMeeple(
  copy: Pick<GameCopy, "id">,
): Promise<string | null> {
  const holding = await prisma.gameHolding.findFirst({
    where: { gameCopyId: copy.id, endedAt: null },
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
  copy: Pick<GameCopy, "id" | "status">,
): Promise<GameZustand> {
  const holding = await prisma.gameHolding.findFirst({
    where: { gameCopyId: copy.id, endedAt: null },
    include: { unit: true },
  });

  if (!holding) {
    throw new HoldingConflictError(
      `Exemplar ${copy.id} hat keinen offenen Aufenthalt — das darf laut Datenmodell nicht vorkommen.`,
    );
  }
  return zustandFromHoldingAndUnit(holding, holding.unit, copy.status);
}
