import { GameCopyCheckResult, GameInventoryStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  formatDefectCondition,
  GAME_ISSUE_CHECK_RESULT,
  isGameIssueKind,
} from "@/lib/ludothek/game-issue";

/**
 * Status-Regel nach einer Kontrolle (#599): der Status folgt der neuesten
 * Kontrolle. Nur „Nicht spielbar" führt in die Wartung, jedes andere
 * Ergebnis zurück nach `ACTIVE`. Ein deinventarisiertes Exemplar bleibt es —
 * die Kontrolle wird trotzdem protokolliert.
 */
export function statusAfterCheck(
  result: GameCopyCheckResult,
  current: GameInventoryStatus,
): GameInventoryStatus {
  if (current === GameInventoryStatus.DEINVENTARISED) return current;
  return result === GameCopyCheckResult.UNPLAYABLE
    ? GameInventoryStatus.MAINTENANCE
    : GameInventoryStatus.ACTIVE;
}

export class GameCopyNotFoundError extends Error {
  constructor() {
    super("Exemplar nicht gefunden.");
  }
}

/**
 * Eine Kontrolle durchführen (#599) — der einzige Weg für „Vollständig
 * bestätigen" und „Mangel melden". In einer Transaktion: Datensatz anlegen,
 * `GameCopy` auf den neuen Stand (`condition`, `lastCheckedAt` = Zeitpunkt
 * des Datensatzes, Flag „Kontrolle nötig" aus, Status nach
 * `statusAfterCheck`). Die Autorisierung liegt bei der Server Action.
 */
export async function applyCheck({
  gameCopyId,
  checkedByMeepleId,
  result,
  condition,
}: {
  gameCopyId: string;
  checkedByMeepleId: string;
  result: GameCopyCheckResult;
  /** Der neue `condition`-Text — zugleich die Notiz des Datensatzes. */
  condition: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const copy = await tx.gameCopy.findUnique({
      where: { id: gameCopyId },
      select: { status: true },
    });
    if (!copy) throw new GameCopyNotFoundError();

    const check = await tx.gameCopyCheck.create({
      data: { gameCopyId, checkedByMeepleId, result, note: condition },
    });
    await tx.gameCopy.update({
      where: { id: gameCopyId },
      data: {
        condition,
        lastCheckedAt: check.checkedAt,
        needsCompletenessCheck: false,
        status: statusAfterCheck(result, copy.status),
      },
    });
    return check;
  });
}

/** „Vollständig bestätigen" — die Notiz ist optional. */
export async function confirmGameCopyCheck(
  gameCopyId: string,
  checkedByMeepleId: string,
  condition: string,
) {
  await applyCheck({
    gameCopyId,
    checkedByMeepleId,
    result: GameCopyCheckResult.COMPLETE,
    condition: condition.trim() || null,
  });
  return { success: true as const };
}

/**
 * „Mangel melden": der Mangel steht als Präfix-Text in `condition` (siehe
 * `game-issue.ts`). Ein unbekanntes `kind` oder eine leere Notiz wird mit
 * `{ error }` abgewiesen.
 */
export async function reportGameCopyDefect(
  gameCopyId: string,
  checkedByMeepleId: string,
  kind: unknown,
  note: string,
) {
  if (!isGameIssueKind(kind)) {
    return { error: "Unbekannte Mangel-Art." };
  }
  if (!note.trim()) {
    return { error: "Bitte eine Notiz zum Mangel angeben." };
  }

  await applyCheck({
    gameCopyId,
    checkedByMeepleId,
    result: GAME_ISSUE_CHECK_RESULT[kind],
    condition: formatDefectCondition(kind, note),
  });
  return { success: true as const };
}
