"use server";

import { prisma } from "@/lib/utils/prisma";
import { getMembershipState, requireMeeple } from "@/lib/members/meeples";
import {
  borrowGame,
  confirmHolding,
  handOverGame,
  HoldingConflictError,
  moveStorageUnit,
  relocateGame,
  resolveScannedCode,
  returnGame,
  type ResolvedScan,
} from "@/lib/ludothek/holdings";

async function requireActingMeeple() {
  const meeple = await requireMeeple();
  return { meeple, membershipState: getMembershipState(meeple) };
}

/** Ausgetretene Meeples dürfen abgeben, aber nichts mehr annehmen (siehe CONTEXT.md). */
function assertCanReceive(
  membershipState: ReturnType<typeof getMembershipState>,
) {
  if (membershipState === "ausgetreten") {
    throw new HoldingConflictError(
      "Ausgetretene Mitglieder können keine Spiele mehr annehmen.",
    );
  }
}

async function toResult<T>(run: () => Promise<T> | T) {
  try {
    return { success: true as const, value: await run() };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unbekannter Fehler.",
    };
  }
}

export async function scanResolveCode(raw: string): Promise<ResolvedScan> {
  await requireMeeple();
  try {
    return await resolveScannedCode(raw);
  } catch {
    return { kind: "unknown", raw };
  }
}

/** Ausleihen — der Scannende bucht immer auf den eigenen Meeple aus. */
export async function scanBorrowGame(boardGameId: string) {
  const { meeple, membershipState } = await requireActingMeeple();

  return toResult(() => {
    assertCanReceive(membershipState);
    return borrowGame({
      boardGameId,
      meepleId: meeple.id,
      recordedByMeepleId: meeple.id,
    });
  });
}

/** "Ich habe es erhalten" — die empfangende Person bestätigt die Weitergabe selbst. */
export async function scanAcceptHandover(boardGameId: string) {
  const { meeple, membershipState } = await requireActingMeeple();

  return toResult(() => {
    assertCanReceive(membershipState);
    return handOverGame({
      boardGameId,
      toMeepleId: meeple.id,
      recordedByMeepleId: meeple.id,
    });
  });
}

/** Die abgebende Person trägt die Weitergabe ein — bleibt bis zum Klick der Empfängerin unbestätigt. */
export async function scanGiveToMeeple(
  boardGameId: string,
  toMeepleId: string,
) {
  const { meeple } = await requireActingMeeple();

  return toResult(() =>
    handOverGame({ boardGameId, toMeepleId, recordedByMeepleId: meeple.id }),
  );
}

/** "Ich nehme es zur Rückgabe an" — abgeschlossen ist die Rückgabe erst durchs Einlagern. */
export async function scanAcceptReturn(boardGameId: string) {
  const { meeple, membershipState } = await requireActingMeeple();

  return toResult(() => {
    assertCanReceive(membershipState);
    return returnGame({
      boardGameId,
      toMeepleId: meeple.id,
      recordedByMeepleId: meeple.id,
    });
  });
}

export async function scanReturnToUnit(boardGameId: string, toUnitId: string) {
  const { meeple } = await requireActingMeeple();

  return toResult(() =>
    returnGame({ boardGameId, toUnitId, recordedByMeepleId: meeple.id }),
  );
}

/** Rückgabe an eine Person, die das Spiel einlagern soll — keine Weitergabe. */
export async function scanReturnToMeeple(
  boardGameId: string,
  toMeepleId: string,
) {
  const { meeple } = await requireActingMeeple();

  return toResult(() =>
    returnGame({ boardGameId, toMeepleId, recordedByMeepleId: meeple.id }),
  );
}

export async function scanRelocateGame(boardGameId: string, toUnitId: string) {
  const { meeple } = await requireActingMeeple();

  return toResult(() =>
    relocateGame({ boardGameId, toUnitId, recordedByMeepleId: meeple.id }),
  );
}

/**
 * Places a scanned game into a unit, regardless of where it currently is —
 * Umlagern if it was already in a unit, Rückgabe if it was with a person.
 * Used by the scan view's manual "in Einheit legen" action and by the
 * "Einlagern in <Einheit>" series mode.
 */
export async function scanPlaceGameInUnit(boardGameId: string, unitId: string) {
  const { meeple } = await requireActingMeeple();

  return toResult(async () => {
    const holding = await prisma.gameHolding.findFirst({
      where: { boardGameId, endedAt: null },
    });
    if (!holding) {
      throw new HoldingConflictError(
        `Spiel ${boardGameId} hat keinen offenen Aufenthalt.`,
      );
    }

    return holding.unitId
      ? relocateGame({
          boardGameId,
          toUnitId: unitId,
          recordedByMeepleId: meeple.id,
        })
      : returnGame({
          boardGameId,
          toUnitId: unitId,
          recordedByMeepleId: meeple.id,
        });
  });
}

export async function scanConfirmHolding(holdingId: string) {
  const { meeple, membershipState } = await requireActingMeeple();

  return toResult(() => {
    assertCanReceive(membershipState);
    return confirmHolding({ holdingId, confirmingMeepleId: meeple.id });
  });
}

export type ScannedGameContext = {
  game: { id: string; title: string; status: string };
  holding: {
    id: string;
    confirmedAt: string | null;
    unitId: string | null;
    unitCode: string | null;
    unitLabel: string | null;
    meepleId: string | null;
    meepleName: string | null;
  } | null;
  isSelf: boolean;
};

/** Enriches a resolved game with its current holding, for the scan view's action menu. */
export async function scanGetGameContext(
  boardGameId: string,
): Promise<ScannedGameContext | null> {
  const { meeple } = await requireActingMeeple();

  const [game, holding] = await Promise.all([
    prisma.boardGame.findUnique({
      where: { id: boardGameId },
      select: { id: true, title: true, status: true },
    }),
    prisma.gameHolding.findFirst({
      where: { boardGameId, endedAt: null },
      include: { unit: true, meeple: { select: { displayName: true } } },
    }),
  ]);

  if (!game) return null;

  return {
    game,
    holding: holding
      ? {
          id: holding.id,
          confirmedAt: holding.confirmedAt?.toISOString() ?? null,
          unitId: holding.unitId,
          unitCode: holding.unit?.code ?? null,
          unitLabel: holding.unit?.label ?? null,
          meepleId: holding.meepleId,
          meepleName: holding.meeple?.displayName ?? null,
        }
      : null,
    isSelf: holding?.meepleId === meeple.id,
  };
}

export async function scanListMeeples() {
  await requireActingMeeple();
  return prisma.meeple.findMany({
    where: { anonymizedAt: null },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });
}

export async function scanEinlagernUnit(
  unitId: string,
  target: {
    keeperMeepleId?: string | null;
    locationNote?: string | null;
    parentUnitId?: string | null;
  },
) {
  const { meeple } = await requireActingMeeple();

  return toResult(() =>
    moveStorageUnit({ unitId, recordedByMeepleId: meeple.id, ...target }),
  );
}
