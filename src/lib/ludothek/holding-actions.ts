"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeplePermission } from "@/lib/members/meeples";
import { memberDisplayName } from "@/lib/members/member-display-name";
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
import { ANONYMER_MEEPLE_NAME } from "@/lib/ludothek/anonymer-meeple";
import {
  assertCanReceive,
  requireActingMeeple,
  requireMemberForMeeple,
  requireOwnMember,
  toResult,
  toResultAndRevalidate,
} from "@/lib/ludothek/holding-actions-shared";

export async function scanResolveCode(raw: string): Promise<ResolvedScan> {
  await requireMeeplePermission("ludothek:borrow");
  try {
    return await resolveScannedCode(raw);
  } catch {
    return { kind: "unknown", raw };
  }
}

/** Ausleihen — der Scannende bucht immer auf das eigene Vereinsmitglied aus. */
export async function scanBorrowGame(gameCopyId: string) {
  const { meeple, member, membershipState } = await requireActingMeeple();

  return toResultAndRevalidate(() => {
    assertCanReceive(membershipState);
    const own = requireOwnMember(member);
    return borrowGame({
      gameCopyId,
      vereinsmitgliedId: own.id,
      recordedByMeepleId: meeple.id,
      isSelf: true,
    });
  });
}

/** "Ich habe es erhalten" — die empfangende Person bestätigt die Weitergabe selbst. */
export async function scanAcceptHandover(gameCopyId: string) {
  const { meeple, member, membershipState } = await requireActingMeeple();

  return toResultAndRevalidate(() => {
    assertCanReceive(membershipState);
    const own = requireOwnMember(member);
    return handOverGame({
      gameCopyId,
      toVereinsmitgliedId: own.id,
      recordedByMeepleId: meeple.id,
      isSelf: true,
    });
  });
}

/** Die abgebende Person trägt die Weitergabe ein — bleibt bis zum Klick der Empfängerin unbestätigt. */
export async function scanGiveToMeeple(gameCopyId: string, toMeepleId: string) {
  const { meeple } = await requireActingMeeple();

  return toResultAndRevalidate(async () => {
    const toMember = await requireMemberForMeeple(toMeepleId);
    return handOverGame({
      gameCopyId,
      toVereinsmitgliedId: toMember.id,
      recordedByMeepleId: meeple.id,
      isSelf: false,
    });
  });
}

/** "Ich nehme es zur Rückgabe an" — abgeschlossen ist die Rückgabe erst durchs Einlagern. */
export async function scanAcceptReturn(gameCopyId: string) {
  const { meeple, member, membershipState } = await requireActingMeeple();

  return toResultAndRevalidate(() => {
    assertCanReceive(membershipState);
    const own = requireOwnMember(member);
    return returnGame({
      gameCopyId,
      toVereinsmitgliedId: own.id,
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

  return toResultAndRevalidate(async () => {
    const toMember = await requireMemberForMeeple(toMeepleId);
    return returnGame({
      gameCopyId,
      toVereinsmitgliedId: toMember.id,
      recordedByMeepleId: meeple.id,
    });
  });
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
  const { member, membershipState } = await requireActingMeeple();

  return toResultAndRevalidate(() => {
    assertCanReceive(membershipState);
    const own = requireOwnMember(member);
    return confirmHolding({ holdingId, confirmingVereinsmitgliedId: own.id });
  });
}

export type ScannedGameContext = {
  game: {
    id: string;
    title: string;
    status: string;
    /** Freie Inventarnummer des Exemplars (#270). */
    inventoryNumber: string | null;
  };
  holding: {
    id: string;
    confirmedAt: string | null;
    origin: string;
    unitId: string | null;
    unitCode: string | null;
    unitLabel: string | null;
    vereinsmitgliedId: string | null;
    vereinsmitgliedName: string | null;
    /** Ob das haltende Vereinsmitglied ein Portal-Konto mit Login hat (#333). */
    verfuegbar: boolean;
  } | null;
  isSelf: boolean;
};

/** Enriches a resolved copy with its current holding, for the scan view's action menu. */
export async function scanGetGameContext(
  gameCopyId: string,
): Promise<ScannedGameContext | null> {
  const { member } = await requireActingMeeple();

  const [copy, holding] = await Promise.all([
    prisma.gameCopy.findUnique({
      where: { id: gameCopyId },
      select: {
        id: true,
        status: true,
        inventoryNumber: true,
        boardGame: { select: { title: true } },
      },
    }),
    prisma.gameHolding.findFirst({
      where: { gameCopyId, endedAt: null },
      include: {
        unit: true,
        vereinsmitglied: {
          include: {
            meeple: { select: { displayName: true, neonAuthUserId: true } },
          },
        },
      },
    }),
  ]);

  if (!copy) return null;

  return {
    game: {
      id: copy.id,
      title: copy.boardGame.title,
      status: copy.status,
      inventoryNumber: copy.inventoryNumber,
    },
    holding: holding
      ? {
          id: holding.id,
          confirmedAt: holding.confirmedAt?.toISOString() ?? null,
          origin: holding.origin,
          unitId: holding.unitId,
          unitCode: holding.unit?.code ?? null,
          unitLabel: holding.unit?.label ?? null,
          vereinsmitgliedId: holding.vereinsmitgliedId,
          vereinsmitgliedName: holding.vereinsmitglied
            ? memberDisplayName(holding.vereinsmitglied)
            : null,
          verfuegbar: Boolean(holding.vereinsmitglied?.meeple?.neonAuthUserId),
        }
      : null,
    isSelf: holding?.vereinsmitgliedId === member?.id,
  };
}

/** Target list for the "Weitergeben"/"An Person zurückgeben"-Picker — Meeples
 * mit Portal-Konto. Das Sammelkonto "Anonymer Meeple" ist bewusst ausgeschlossen:
 * dorthin führt ausschließlich `scanHandOverToExternal()` (#333b), nicht diese
 * generische Auswahl. */
export async function scanListMeeples() {
  await requireActingMeeple();
  return prisma.meeple.findMany({
    where: {
      anonymizedAt: null,
      displayName: { not: ANONYMER_MEEPLE_NAME },
    },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });
}

/** Target list for the Umlagern mini-dialog (#121/#122) — active units only. */
export async function scanListUnits() {
  await requireActingMeeple();
  return prisma.storageUnit.findMany({
    where: { retiredAt: null },
    orderBy: { label: "asc" },
    select: { id: true, code: true, label: true },
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
