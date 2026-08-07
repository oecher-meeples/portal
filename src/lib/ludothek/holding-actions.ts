"use server";

import { revalidatePath } from "next/cache";
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

async function toResult<T>(
  run: () => Promise<T> | T,
  onSuccess?: (value: T) => Promise<void> | void,
) {
  try {
    const value = await run();
    if (onSuccess) await onSuccess(value);
    return { success: true as const, value };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unbekannter Fehler.",
    };
  }
}

/** Revalidates the list, admin overview and (if resolvable) the copy's detail page — only called on success. */
async function revalidateGamePaths(gameCopyId: string) {
  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  const copy = await prisma.gameCopy.findUnique({
    where: { id: gameCopyId },
    select: { slug: true },
  });
  if (copy) revalidatePath(`/ludothek/${copy.slug}`);
}

function toResultAndRevalidate<T extends { gameCopyId: string }>(
  run: () => Promise<T> | T,
) {
  return toResult(run, (value) => revalidateGamePaths(value.gameCopyId));
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
export async function scanBorrowGame(gameCopyId: string) {
  const { meeple, membershipState } = await requireActingMeeple();

  return toResultAndRevalidate(() => {
    assertCanReceive(membershipState);
    return borrowGame({
      gameCopyId,
      meepleId: meeple.id,
      recordedByMeepleId: meeple.id,
    });
  });
}

/** "Ich habe es erhalten" — die empfangende Person bestätigt die Weitergabe selbst. */
export async function scanAcceptHandover(gameCopyId: string) {
  const { meeple, membershipState } = await requireActingMeeple();

  return toResultAndRevalidate(() => {
    assertCanReceive(membershipState);
    return handOverGame({
      gameCopyId,
      toMeepleId: meeple.id,
      recordedByMeepleId: meeple.id,
    });
  });
}

/** Die abgebende Person trägt die Weitergabe ein — bleibt bis zum Klick der Empfängerin unbestätigt. */
export async function scanGiveToMeeple(gameCopyId: string, toMeepleId: string) {
  const { meeple } = await requireActingMeeple();

  return toResultAndRevalidate(() =>
    handOverGame({ gameCopyId, toMeepleId, recordedByMeepleId: meeple.id }),
  );
}

/** "Ich nehme es zur Rückgabe an" — abgeschlossen ist die Rückgabe erst durchs Einlagern. */
export async function scanAcceptReturn(gameCopyId: string) {
  const { meeple, membershipState } = await requireActingMeeple();

  return toResultAndRevalidate(() => {
    assertCanReceive(membershipState);
    return returnGame({
      gameCopyId,
      toMeepleId: meeple.id,
      recordedByMeepleId: meeple.id,
    });
  });
}

export async function scanReturnToUnit(gameCopyId: string, toUnitId: string) {
  const { meeple } = await requireActingMeeple();

  return toResultAndRevalidate(() =>
    returnGame({ gameCopyId, toUnitId, recordedByMeepleId: meeple.id }),
  );
}

/** Rückgabe an eine Person, die das Spiel einlagern soll — keine Weitergabe. */
export async function scanReturnToMeeple(
  gameCopyId: string,
  toMeepleId: string,
) {
  const { meeple } = await requireActingMeeple();

  return toResultAndRevalidate(() =>
    returnGame({ gameCopyId, toMeepleId, recordedByMeepleId: meeple.id }),
  );
}

export async function scanRelocateGame(gameCopyId: string, toUnitId: string) {
  const { meeple } = await requireActingMeeple();

  return toResultAndRevalidate(() =>
    relocateGame({ gameCopyId, toUnitId, recordedByMeepleId: meeple.id }),
  );
}

/**
 * Places a scanned copy into a unit, regardless of where it currently is —
 * Umlagern if it was already in a unit, Rückgabe if it was with a person.
 * Used by the scan view's manual "in Einheit legen" action and by the
 * "Einlagern in <Einheit>" series mode.
 */
export async function scanPlaceGameInUnit(gameCopyId: string, unitId: string) {
  const { meeple } = await requireActingMeeple();

  return toResultAndRevalidate(async () => {
    const holding = await prisma.gameHolding.findFirst({
      where: { gameCopyId, endedAt: null },
    });
    if (!holding) {
      throw new HoldingConflictError(
        `Exemplar ${gameCopyId} hat keinen offenen Aufenthalt.`,
      );
    }

    return holding.unitId
      ? relocateGame({
          gameCopyId,
          toUnitId: unitId,
          recordedByMeepleId: meeple.id,
        })
      : returnGame({
          gameCopyId,
          toUnitId: unitId,
          recordedByMeepleId: meeple.id,
        });
  });
}

export async function scanConfirmHolding(holdingId: string) {
  const { meeple, membershipState } = await requireActingMeeple();

  return toResultAndRevalidate(() => {
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

/** Enriches a resolved copy with its current holding, for the scan view's action menu. */
export async function scanGetGameContext(
  gameCopyId: string,
): Promise<ScannedGameContext | null> {
  const { meeple } = await requireActingMeeple();

  const [copy, holding] = await Promise.all([
    prisma.gameCopy.findUnique({
      where: { id: gameCopyId },
      select: {
        id: true,
        status: true,
        boardGame: { select: { title: true } },
      },
    }),
    prisma.gameHolding.findFirst({
      where: { gameCopyId, endedAt: null },
      include: { unit: true, meeple: { select: { displayName: true } } },
    }),
  ]);

  if (!copy) return null;

  return {
    game: { id: copy.id, title: copy.boardGame.title, status: copy.status },
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

  const result = await toResult(() =>
    moveStorageUnit({ unitId, recordedByMeepleId: meeple.id, ...target }),
  );
  if ("success" in result) {
    revalidatePath("/ludothek");
    revalidatePath("/admin/bestand");
  }
  return result;
}
