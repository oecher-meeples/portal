import { prisma } from "@/lib/utils/prisma";
import { formatDateTime } from "@/lib/utils/format";
import { anonymisedMeepleDisplayName } from "@/lib/members/anonymised-display-name";
import {
  GAME_COPY_CHECK_RESULT_LABELS,
  type GameCopyCheckResultKey,
} from "@/lib/ludothek/game-issue";

export type CheckHistoryEntry = {
  id: string;
  result: GameCopyCheckResultKey;
  resultLabel: string;
  checkedAt: string;
  note: string | null;
  checkedByName: string;
};

/**
 * Kontroll-Historie (#599) je Exemplar, neueste zuerst — vollständig geladen
 * (wenige Kontrollen pro Exemplar, das Kürzen übernimmt die Anzeige). Nur für
 * `games:manage` gedacht; der Aufrufer entscheidet, ob er lädt.
 */
export async function loadCheckHistories(
  gameCopyIds: string[],
): Promise<Map<string, CheckHistoryEntry[]>> {
  const byCopyId = new Map<string, CheckHistoryEntry[]>();
  if (gameCopyIds.length === 0) return byCopyId;

  const checks = await prisma.gameCopyCheck.findMany({
    where: { gameCopyId: { in: gameCopyIds } },
    orderBy: { checkedAt: "desc" },
    include: {
      checkedBy: {
        select: { id: true, displayName: true, anonymizedAt: true },
      },
    },
  });

  for (const check of checks) {
    const entries = byCopyId.get(check.gameCopyId) ?? [];
    entries.push({
      id: check.id,
      result: check.result,
      resultLabel: GAME_COPY_CHECK_RESULT_LABELS[check.result],
      checkedAt: formatDateTime(check.checkedAt),
      note: check.note,
      // Nur `games:manage` sieht die Kontroll-Historie überhaupt.
      checkedByName: anonymisedMeepleDisplayName(check.checkedBy, true),
    });
    byCopyId.set(check.gameCopyId, entries);
  }
  return byCopyId;
}
