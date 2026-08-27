"use server";

import { revalidatePath } from "next/cache";
import { relocateGame } from "@/lib/ludothek/holdings";
import { ensureMeeple } from "@/lib/members/meeples";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";

/**
 * Sammel-Umlagern (#273, CONTEXT.md-Konzept, hier erstmals implementiert):
 * Ziel-Einheit einmal wählen/scannen, danach mehrere Exemplare nacheinander
 * scannen — jeder Aufruf legt genau ein Exemplar auf dieselbe Ziel-Einheit.
 * Gemeinsamer Baustein für Event-Ausgabe (Stufe 1: Sammel-Platz), Event-
 * Rückgabe und die Regal-unter-Event-Zuordnung (Stufe 2) — alle drei sind
 * fachlich dieselbe Operation, nur mit unterschiedlicher Ziel-Einheit.
 * `games:manage`-only wie die übrigen neuen `admin/bestand`-Unterseiten.
 */
export async function bulkRelocateGameCopy(
  gameCopyId: string,
  targetUnitId: string,
) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const actor = await ensureMeeple(user);

  try {
    await relocateGame({
      gameCopyId,
      toUnitId: targetUnitId,
      recordedByMeepleId: actor.id,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unbekannter Fehler.",
    };
  }

  revalidatePath("/admin/bestand");
  revalidatePath("/ludothek");
  return { success: true as const };
}
