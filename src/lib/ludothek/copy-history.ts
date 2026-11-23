import { prisma } from "@/lib/utils/prisma";
import { formatDateTime } from "@/lib/utils/format";
import { memberDisplayName } from "@/lib/members/member-display-name";
import { anonymisedMeepleDisplayName } from "@/lib/members/anonymised-display-name";
import {
  loadCheckHistories,
  type CheckHistoryEntry,
} from "@/lib/ludothek/game-copy-checks-read";

const ORIGIN_LABELS: Record<string, string> = {
  INITIAL: "Ersterfassung",
  LOAN: "Ausleihe",
  RETURN: "Rückgabe",
  HANDOVER: "Weitergabe",
  RELOCATION: "Umlagern",
};

/** Höchstens so viele Aufenthalte zeigt die Detailseite pro Exemplar (#599). */
export const HOLDING_HISTORY_LIMIT = 15;

export type HoldingHistoryEntry = {
  id: string;
  origin: string;
  target: string;
  startedAt: string;
  endedAt: string | null;
  confirmedAt: string | null;
  recordedByName: string;
};

/** Beide Historien eines Exemplars für dessen Akkordeon (#599). */
export type CopyHistory = {
  holdings: HoldingHistoryEntry[];
  /** Es gibt ältere Aufenthalte als die gezeigten. */
  holdingsTruncated: boolean;
  /** `null` = keine Berechtigung (`games:manage`), nicht „keine Kontrollen". */
  checks: CheckHistoryEntry[] | null;
};

export const EMPTY_COPY_HISTORY: CopyHistory = {
  holdings: [],
  holdingsTruncated: false,
  checks: null,
};

async function loadHoldingHistory(gameCopyId: string, canManageGames: boolean) {
  // Eine Abfrage pro Exemplar, damit das Limit pro Exemplar greift; die
  // 16. Zeile verrät nur, dass es ältere gibt.
  const holdings = await prisma.gameHolding.findMany({
    where: { gameCopyId },
    orderBy: { startedAt: "desc" },
    take: HOLDING_HISTORY_LIMIT + 1,
    include: {
      unit: { select: { label: true, code: true } },
      vereinsmitglied: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          meeple: { select: { displayName: true } },
        },
      },
      recordedBy: {
        select: { id: true, displayName: true, anonymizedAt: true },
      },
    },
  });

  const entries = holdings
    .slice(0, HOLDING_HISTORY_LIMIT)
    .map<HoldingHistoryEntry>((holding) => ({
      id: holding.id,
      origin: ORIGIN_LABELS[holding.origin] ?? holding.origin,
      target: holding.vereinsmitglied
        ? memberDisplayName(holding.vereinsmitglied)
        : (holding.unit?.label ?? holding.unit?.code ?? "—"),
      startedAt: formatDateTime(holding.startedAt),
      endedAt: holding.endedAt ? formatDateTime(holding.endedAt) : null,
      confirmedAt: holding.confirmedAt?.toISOString() ?? null,
      // Anonymisierten Alt-Meeples nur für `games:manage` den Suffix (#364).
      recordedByName: anonymisedMeepleDisplayName(
        holding.recordedBy,
        canManageGames,
      ),
    }));
  return {
    entries,
    truncated: holdings.length > HOLDING_HISTORY_LIMIT,
  };
}

/**
 * Aufenthalts- und (nur `games:manage`) Kontroll-Historie je Exemplar eines
 * Titels für die Detailseite (#599).
 */
export async function loadCopyHistories(
  gameCopyIds: string[],
  canManageGames: boolean,
): Promise<Map<string, CopyHistory>> {
  const [holdingHistories, checkHistories] = await Promise.all([
    Promise.all(
      gameCopyIds.map((id) => loadHoldingHistory(id, canManageGames)),
    ),
    canManageGames ? loadCheckHistories(gameCopyIds) : null,
  ]);

  return new Map(
    gameCopyIds.map((id, index) => [
      id,
      {
        holdings: holdingHistories[index].entries,
        holdingsTruncated: holdingHistories[index].truncated,
        checks: checkHistories ? (checkHistories.get(id) ?? []) : null,
      },
    ]),
  );
}
