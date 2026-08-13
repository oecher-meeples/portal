import {
  GameInventoryStatus,
  HoldingOrigin,
  type GameHolding,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  GameDeinventarisedError,
  GameNotFoundError,
  HoldingConflictError,
  UnitNotFoundError,
  UnitRetiredError,
} from "@/lib/ludothek/errors";

type Tx = PrismaClient | Prisma.TransactionClient;

async function requireOpenHolding(tx: Tx, gameCopyId: string) {
  const holding = await tx.gameHolding.findFirst({
    where: { gameCopyId, endedAt: null },
  });
  if (!holding) {
    throw new HoldingConflictError(
      `Exemplar ${gameCopyId} hat keinen offenen Aufenthalt — das darf laut Datenmodell nicht vorkommen.`,
    );
  }
  return holding;
}

async function requireActiveCopy(tx: Tx, gameCopyId: string) {
  const copy = await tx.gameCopy.findUnique({ where: { id: gameCopyId } });
  if (!copy) {
    throw new GameNotFoundError(gameCopyId);
  }
  return copy;
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
    gameCopyId,
    previous,
    target,
    origin,
    recordedByMeepleId,
    confirmedAt,
    note,
  }: {
    gameCopyId: string;
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
      gameCopyId,
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
function confirmationFor(
  recordedByMeepleId: string,
  receivingMeepleId: string,
) {
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
    (holding.origin === HoldingOrigin.LOAN ||
      holding.origin === HoldingOrigin.HANDOVER)
  );
}

export async function borrowGame({
  gameCopyId,
  meepleId,
  recordedByMeepleId,
  note,
}: {
  gameCopyId: string;
  meepleId: string;
  recordedByMeepleId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const copy = await requireActiveCopy(tx, gameCopyId);
    if (copy.status === GameInventoryStatus.DEINVENTARISED) {
      throw new GameDeinventarisedError(gameCopyId);
    }

    const previous = await requireOpenHolding(tx, gameCopyId);
    if (!previous.unitId) {
      throw new HoldingConflictError(
        "Nur ein Spiel in einer Aufbewahrungseinheit kann ausgeliehen werden — dieses liegt bereits bei einer Person.",
      );
    }

    return closeAndOpen(tx, {
      gameCopyId,
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
  gameCopyId,
  toMeepleId,
  recordedByMeepleId,
  note,
}: {
  gameCopyId: string;
  toMeepleId: string;
  recordedByMeepleId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, gameCopyId);
    if (!previous.meepleId) {
      throw new HoldingConflictError(
        "Weitergeben kann nur, wer das Spiel gerade selbst bei sich hat — es liegt aktuell in einer Einheit.",
      );
    }

    return closeAndOpen(tx, {
      gameCopyId,
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
  gameCopyId,
  toUnitId,
  toMeepleId,
  recordedByMeepleId,
  note,
}: {
  gameCopyId: string;
  recordedByMeepleId: string;
  note?: string | null;
} & (
  | { toUnitId: string; toMeepleId?: never }
  | { toMeepleId: string; toUnitId?: never }
)) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, gameCopyId);
    if (!previous.meepleId) {
      throw new HoldingConflictError(
        "Zurückgeben kann nur, was gerade bei einer Person liegt — dieses Spiel liegt bereits in einer Einheit.",
      );
    }

    if (toUnitId) {
      await requireOpenUnit(tx, toUnitId);
      return closeAndOpen(tx, {
        gameCopyId,
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
      gameCopyId,
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
  gameCopyId,
  toUnitId,
  recordedByMeepleId,
  note,
}: {
  gameCopyId: string;
  toUnitId: string;
  recordedByMeepleId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const previous = await requireOpenHolding(tx, gameCopyId);
    if (!previous.unitId) {
      throw new HoldingConflictError(
        "Umlagern gilt nur für Spiele, die bereits in einer Einheit liegen — dieses ist ausgeliehen.",
      );
    }

    await requireOpenUnit(tx, toUnitId);

    return closeAndOpen(tx, {
      gameCopyId,
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
  const holding = await prisma.gameHolding.findUnique({
    where: { id: holdingId },
  });
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

export {
  ensureUnsortiertUnit,
  formatLocationChain,
  getGameZustand,
  getResponsibleMeeple,
  resolveScannedCode,
  walkUnitChain,
  zustandFromHoldingAndUnit,
  type GameZustand,
  type ResolvedScan,
  type UnitChainNode,
} from "@/lib/ludothek/holdings-lookup";

export {
  GameDeinventarisedError,
  GameNotFoundError,
  HoldingConflictError,
  UnitNotFoundError,
  UnitRetiredError,
};
