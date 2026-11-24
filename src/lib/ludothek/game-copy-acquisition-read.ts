import { GameInventoryStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { acquiredOnToInput } from "@/lib/ludothek/game-copy-acquisition";

/** Leseseite der Anschaffungsdaten (#615) — getrennt von
 * `game-copy-acquisition.ts`, weil dessen Parser auch im Client-Bundle der
 * Exemplar-Formulare landen. */

export type InventoryValueSummary = {
  /** Summe der bekannten Werte aller nicht deinventarisierten Exemplare. */
  totalCents: number;
  /** Nicht deinventarisierte Exemplare ohne erfassten Wert. */
  withoutValueCount: number;
};

/**
 * Bestandswert für die Ludothek-Übersicht (#615). Deinventarisierte
 * Exemplare behalten ihren Wert, zählen aber nicht mit.
 */
export async function getInventoryValueSummary(): Promise<InventoryValueSummary> {
  const where = { status: { not: GameInventoryStatus.DEINVENTARISED } };
  const [{ _sum }, withoutValueCount] = await Promise.all([
    prisma.gameCopy.aggregate({ where, _sum: { valueCents: true } }),
    prisma.gameCopy.count({ where: { ...where, valueCents: null } }),
  ]);
  return { totalCents: _sum.valueCents ?? 0, withoutValueCount };
}

/** Client-taugliche Form: `acquiredOn` als `JJJJ-MM-TT`-Text. */
export type GameCopyAcquisition = {
  valueCents: number | null;
  acquiredOn: string | null;
};

/** DB-Felder → `GameCopyAcquisition` — geteilt von Detailseite und
 * `/admin/bestand`. */
export function toGameCopyAcquisition(copy: {
  valueCents: number | null;
  acquiredOn: Date | null;
}): GameCopyAcquisition {
  return {
    valueCents: copy.valueCents,
    acquiredOn: copy.acquiredOn ? acquiredOnToInput(copy.acquiredOn) : null,
  };
}

/** Anschaffungsdaten der angegebenen Exemplare — für die Titel-Detailseite,
 * die ihre Exemplare sonst ohne diese Felder lädt (sie dürfen nur an
 * `games:manage`). */
export async function findGameCopyAcquisitions(
  gameCopyIds: string[],
): Promise<Map<string, GameCopyAcquisition>> {
  if (gameCopyIds.length === 0) return new Map();
  const rows = await prisma.gameCopy.findMany({
    where: { id: { in: gameCopyIds } },
    select: { id: true, valueCents: true, acquiredOn: true },
  });
  return new Map(rows.map((row) => [row.id, toGameCopyAcquisition(row)]));
}
