import { GameInventoryStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  formatDefectCondition,
  isGameIssueKind,
} from "@/lib/ludothek/game-issue";

/**
 * Mangel melden: `ACTIVE → MAINTENANCE`, der Mangel steht als Präfix-Text in
 * `condition` (siehe `game-issue.ts`). Die Autorisierung liegt bei der
 * aufrufenden Server Action; hier nur Regel und Datenformat. Ein unbekanntes
 * `kind` oder eine leere Notiz wird mit `{ error }` abgewiesen.
 */
export async function reportGameCopyDefect(
  gameCopyId: string,
  kind: unknown,
  note: string,
) {
  if (!isGameIssueKind(kind)) {
    return { error: "Unbekannte Mangel-Art." };
  }
  if (!note.trim()) {
    return { error: "Bitte eine Notiz zum Mangel angeben." };
  }

  await prisma.gameCopy.update({
    where: { id: gameCopyId },
    data: {
      condition: formatDefectCondition(kind, note),
      lastCheckedAt: new Date(),
      status: GameInventoryStatus.MAINTENANCE,
    },
  });

  return { success: true as const };
}

/** Mangel beheben: `MAINTENANCE → ACTIVE`. */
export async function clearGameCopyDefect(gameCopyId: string) {
  await prisma.gameCopy.update({
    where: { id: gameCopyId },
    data: { status: GameInventoryStatus.ACTIVE },
  });

  return { success: true as const };
}
