import { prisma } from "@/lib/utils/prisma";
import { findUnitAncestor } from "@/lib/ludothek/unit-chain";
import { parseShortId, unitCodeFromShortId } from "@/lib/short-id/short-id";

/** `StorageUnit.id` → `parentUnitId` aller Einheiten — Grundlage jedes
 * Kettenaufstiegs über `findUnitAncestor`. */
export async function loadUnitParents() {
  const units = await prisma.storageUnit.findMany({
    select: { id: true, parentUnitId: true },
  });
  return new Map(units.map((u) => [u.id, u.parentUnitId]));
}

/** `GameCopy.id` → Einheit des offenen Aufenthalts; verliehene Exemplare
 * (bei einer Person) fehlen. */
export async function loadOpenHoldingUnitByGame() {
  const holdings = await prisma.gameHolding.findMany({
    where: { endedAt: null, unitId: { not: null } },
    select: { gameCopyId: true, unitId: true },
  });
  return new Map(holdings.map((h) => [h.gameCopyId, h.unitId as string]));
}

/**
 * GameCopy-Ids, die gerade in `rootUnitId` oder einer darin stehenden
 * Einheit liegen (Kiste im Regal) — geteilt von der Event-Anwesenheit
 * (#273, Wurzel = Event-Unit) und dem Ludothek-Filter `?einheit=` (#550,
 * Wurzel = gescannte Kiste/Regal).
 */
export async function getGameCopyIdsInUnitTree(
  rootUnitId: string,
): Promise<Set<string>> {
  const [parentById, holdingUnitByGame] = await Promise.all([
    loadUnitParents(),
    loadOpenHoldingUnitByGame(),
  ]);

  const contained = new Set<string>();
  for (const [gameCopyId, unitId] of holdingUnitByGame) {
    if (findUnitAncestor(unitId, parentById, (id) => id === rootUnitId)) {
      contained.add(gameCopyId);
    }
  }
  return contained;
}

/** Ludothek-Filter `?einheit=box-0001` (#550): die Einheit hinter der
 * Short-ID samt aller Exemplare darin — `null` bei ungültiger oder
 * unbekannter Short-ID. */
export async function resolveUnitFilter(slug: string) {
  const shortId = parseShortId(slug);
  if (shortId?.kind !== "box" && shortId?.kind !== "shelf") return null;

  const unit = await prisma.storageUnit.findUnique({
    where: { code: unitCodeFromShortId(shortId) },
    select: { id: true, label: true, code: true },
  });
  if (!unit) return null;

  return { unit, gameCopyIds: await getGameCopyIdsInUnitTree(unit.id) };
}
