/**
 * Aufstieg durch die `StorageUnit`-Kette (Karton → Regal → Raum). Tiefenlimit,
 * damit ein (fehlerhafter) Zyklus in `parentUnitId` nie zur Endlosschleife wird.
 * Einzige Stelle dieser Regel — Aufrufer gehen nie selbst durch `parentUnitId`.
 */
export const MAX_UNIT_CHAIN_DEPTH = 20;

export type UnitChainNode = {
  label: string;
  parentUnitId: string | null;
  keeperMeepleId: string | null;
};

/** Walks a unit chain from a leaf up towards the root, stopping at the first
 * keeper found — that person is the pickup orientation point, further
 * ancestor units aren't shown (see #121 Standort-Kette). */
export function walkUnitChain(
  unitId: string,
  unitById: Map<string, UnitChainNode>,
) {
  const labels: string[] = [];
  let keeperMeepleId: string | null = null;
  let currentId: string | null = unitId;
  let depth = 0;

  while (currentId && depth < MAX_UNIT_CHAIN_DEPTH) {
    const unit = unitById.get(currentId);
    if (!unit) break;
    labels.push(unit.label);
    if (unit.keeperMeepleId) {
      keeperMeepleId = unit.keeperMeepleId;
      break;
    }
    currentId = unit.parentUnitId;
    depth += 1;
  }

  return { unitChain: labels.reverse().join(" → "), keeperMeepleId };
}

/** Voller Pfad von der Wurzel bis `unitId` („Regal A → Karton 3"), ohne an
 * einem Verwahrer anzuhalten — für Ansichten, die den ganzen Standort zeigen. */
export function unitChainLabel(
  unitId: string,
  unitById: Map<string, Pick<UnitChainNode, "label" | "parentUnitId">>,
) {
  const labels: string[] = [];
  let currentId: string | null = unitId;
  for (let depth = 0; currentId && depth < MAX_UNIT_CHAIN_DEPTH; depth++) {
    const unit = unitById.get(currentId);
    if (!unit) break;
    labels.push(unit.label);
    currentId = unit.parentUnitId;
  }
  return labels.reverse().join(" → ");
}

/** Erste Einheit auf dem Weg von `unitId` zur Wurzel (inklusive `unitId`
 * selbst), für die `matches` zutrifft — `null`, wenn keine passt. */
export function findUnitAncestor(
  unitId: string,
  parentById: Map<string, string | null>,
  matches: (id: string) => boolean,
): string | null {
  let currentId: string | null = unitId;
  for (let depth = 0; currentId && depth < MAX_UNIT_CHAIN_DEPTH; depth++) {
    if (matches(currentId)) return currentId;
    currentId = parentById.get(currentId) ?? null;
  }
  return null;
}
