import {
  GameInventoryStatus,
  HoldingOrigin,
  type BoardGame,
  type GameHolding,
  type Prisma,
  type PrismaClient,
  type StorageUnit,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UNSORTIERT_CODE, parseScannedCode } from "@/lib/inventory/codes";
import {
  GameDeinventarisedError,
  GameNotFoundError,
  HoldingConflictError,
  UnitNotFoundError,
  UnitRetiredError,
} from "@/lib/ludothek/errors";

type Tx = PrismaClient | Prisma.TransactionClient;

const MAX_UNIT_CHAIN_DEPTH = 20;

export type GameZustand = "frei" | "ausgeliehen" | "wartung" | "nicht-erfasst";

async function requireOpenHolding(tx: Tx, boardGameId: string) {
  const holding = await tx.gameHolding.findFirst({
    where: { boardGameId, endedAt: null },
  });
  if (!holding) {
    throw new HoldingConflictError(
      `Spiel ${boardGameId} hat keinen offenen Aufenthalt — das darf laut Datenmodell nicht vorkommen.`,
    );
  }
  return holding;
}

async function requireActiveGame(tx: Tx, boardGameId: string) {
  const game = await tx.boardGame.findUnique({ where: { id: boardGameId } });
  if (!game) {
    throw new GameNotFoundError(boardGameId);
  }
  return game;
}

async function requireOpenUnit(tx: Tx, unitId: string) {
  const unit = await tx.storageUnit.findUnique({ where: { id: unitId } });
  if (!unit) {
    throw new UnitNotFoundError(unitId);
  }
  if (unit.retiredAt) {
    throw new UnitRetiredError(unitId);
  }
  return unit;
}

async function closeAndOpen(
  tx: Tx,
  {
    boardGameId,
    previous,
    target,
    origin,
    recordedByMeepleId,
    confirmedAt,
    note,
  }: {
    boardGameId: string;
    previous: GameHolding;
    target: { unitId: string } | { meepleId: string };
    origin: HoldingOrigin;
    recordedByMeepleId: string;
    confirmedAt: Date | null;
    note?: string | null;
  },
) {
  const now = new Date();
  await tx.gameHolding.update({
    where: { id: previous.id },
    data: { endedAt: now },
  });

  return tx.gameHolding.create({
    data: {
      boardGameId,
      ...target,
      origin,
      startedAt: now,
      confirmedAt,
      recordedByMeepleId,
      note: note ?? null,
    },
  });
}

/** Whoever records the transition as the receiving party gets it confirmed right away. */
function confirmationFor(recordedByMeepleId: string, receivingMeepleId: string) {
  return recordedByMeepleId === receivingMeepleId ? new Date() : null;
}

/**
 * A holding counts as a loan exactly when it targets a Meeple via LOAN or HANDOVER —
 * a RETURN to a person is explicitly not a loan (see CONTEXT.md "Ausleihe").
 */
export function isLoanHolding(
  holding: Pick<GameHolding, "meepleId" | "origin">,
) {
  return (
    holding.meepleId !== null &&
    (holding.origin === HoldingOrigin.LOAN || holding.origin === HoldingOrigin.HANDOVER)
  );
}

export async function borrowGame({
  boardGameId,
  meepleId,
  recordedByMeepleId,
  note,
}: {
  boardGameId: string;
  meepleId: string;
  recordedByMeepleId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const game = await requireActiveGame(tx, boardGameId);
    if (game.status === GameInventoryStatus.DEINVENTARISED) {
      throw new GameDeinventarisedError(boardGameId);
    }

    const previous = await requireOpenHolding(tx, boardGameId);
    if (!previous.unitId) {
      throw new HoldingConflictError(
        "Nur ein Spiel in einer Aufbewahrungseinheit kann ausgeliehen werden — dieses liegt bereits bei einer Person.",
      );
    }

    return closeAndOpen(tx, {
      boardGameId,
      previous,
      target: { meepleId },
      origin: HoldingOrigin.LOAN,
      recordedByMeepleId,
      confirmedAt: confirmationFor(recordedByMeepleId, meepleId),
      note,
    });
  });
}

export async function handOverGame({
  boardGameId,
  toMeepleId,
  recordedByMeepleId,
  note,
}: {
  boardGameId: string;
  toMeepleId: string;
  recordedByMeepleId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, boardGameId);
    if (!previous.meepleId) {
      throw new HoldingConflictError(
        "Weitergeben kann nur, wer das Spiel gerade selbst bei sich hat — es liegt aktuell in einer Einheit.",
      );
    }

    return closeAndOpen(tx, {
      boardGameId,
      previous,
      target: { meepleId: toMeepleId },
      origin: HoldingOrigin.HANDOVER,
      recordedByMeepleId,
      confirmedAt: confirmationFor(recordedByMeepleId, toMeepleId),
      note,
    });
  });
}

export async function returnGame({
  boardGameId,
  toUnitId,
  toMeepleId,
  recordedByMeepleId,
  note,
}: {
  boardGameId: string;
  recordedByMeepleId: string;
  note?: string | null;
} & ({ toUnitId: string; toMeepleId?: never } | { toMeepleId: string; toUnitId?: never })) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, boardGameId);
    if (!previous.meepleId) {
      throw new HoldingConflictError(
        "Zurückgeben kann nur, was gerade bei einer Person liegt — dieses Spiel liegt bereits in einer Einheit.",
      );
    }

    if (toUnitId) {
      await requireOpenUnit(tx, toUnitId);
      return closeAndOpen(tx, {
        boardGameId,
        previous,
        target: { unitId: toUnitId },
        origin: HoldingOrigin.RETURN,
        recordedByMeepleId,
        // Being in a unit is itself the confirmation — see CONTEXT.md "Rückgabe".
        confirmedAt: new Date(),
        note,
      });
    }

    return closeAndOpen(tx, {
      boardGameId,
      previous,
      target: { meepleId: toMeepleId! },
      origin: HoldingOrigin.RETURN,
      recordedByMeepleId,
      // Only completed once the accepting person actually stores it away (einlagern).
      confirmedAt: null,
      note,
    });
  });
}

export async function relocateGame({
  boardGameId,
  toUnitId,
  recordedByMeepleId,
  note,
}: {
  boardGameId: string;
  toUnitId: string;
  recordedByMeepleId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, boardGameId);
    if (!previous.unitId) {
      throw new HoldingConflictError(
        "Umlagern gilt nur für Spiele, die bereits in einer Einheit liegen — dieses ist ausgeliehen.",
      );
    }

    await requireOpenUnit(tx, toUnitId);

    return closeAndOpen(tx, {
      boardGameId,
      previous,
      target: { unitId: toUnitId },
      origin: HoldingOrigin.RELOCATION,
      recordedByMeepleId,
      // Relocating never creates a stage on the person who moved it.
      confirmedAt: new Date(),
      note,
    });
  });
}

export async function confirmHolding({
  holdingId,
  confirmingMeepleId,
}: {
  holdingId: string;
  confirmingMeepleId: string;
}) {
  const holding = await prisma.gameHolding.findUnique({ where: { id: holdingId } });
  if (!holding || holding.endedAt) {
    throw new HoldingConflictError("Dieser Aufenthalt ist nicht mehr offen.");
  }
  if (holding.meepleId !== confirmingMeepleId) {
    throw new HoldingConflictError(
      "Nur die empfangende Person kann diesen Aufenthalt bestätigen.",
    );
  }
  if (holding.origin === HoldingOrigin.RETURN) {
    throw new HoldingConflictError(
      "Eine Rückgabe wird nicht per Klick bestätigt, sondern durch Einlagern in eine Einheit.",
    );
  }
  if (holding.confirmedAt) {
    return holding;
  }

  return prisma.gameHolding.update({
    where: { id: holdingId },
    data: { confirmedAt: new Date() },
  });
}

export async function moveStorageUnit({
  unitId,
  recordedByMeepleId,
  keeperMeepleId,
  parentUnitId,
  locationNote,
}: {
  unitId: string;
  recordedByMeepleId: string;
  keeperMeepleId?: string | null;
  parentUnitId?: string | null;
  locationNote?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const unit = await requireOpenUnit(tx, unitId);
    const now = new Date();

    await tx.storageUnitMove.updateMany({
      where: { unitId, endedAt: null },
      data: { endedAt: now },
    });

    await tx.storageUnitMove.create({
      data: {
        unitId,
        keeperMeepleId: keeperMeepleId ?? null,
        parentUnitId: parentUnitId ?? null,
        locationNote: locationNote ?? null,
        startedAt: now,
        recordedByMeepleId,
      },
    });

    return tx.storageUnit.update({
      where: { id: unit.id },
      data: {
        keeperMeepleId: keeperMeepleId ?? null,
        parentUnitId: parentUnitId ?? null,
        locationNote: locationNote ?? null,
      },
    });
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
      where: { ean: parsed.value, status: { not: GameInventoryStatus.DEINVENTARISED } },
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
  if (holding.meepleId) return "ausgeliehen";
  if (holding.unit?.code === UNSORTIERT_CODE) return "nicht-erfasst";
  if (game.status === GameInventoryStatus.MAINTENANCE) return "wartung";
  return "frei";
}

export {
  GameDeinventarisedError,
  GameNotFoundError,
  HoldingConflictError,
  UnitNotFoundError,
  UnitRetiredError,
};
