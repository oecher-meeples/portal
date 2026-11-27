import type { HelperPhase } from "@prisma/client";

/** Deutsche Bezeichnungen der Helfersichtbarkeit (#676). */
export const HELPER_PHASE_LABELS: Record<HelperPhase, string> = {
  PLANNING: "Planungsphase",
  SEEKING: "Helfer gesucht",
  CONFIRMATION_REQUESTED: "Bestätigung angefragt",
};

/** Reihenfolge der Phasen — jede schließt die vorherige ein (kumulativ). */
export const HELPER_PHASE_ORDER: readonly HelperPhase[] = [
  "PLANNING",
  "SEEKING",
  "CONFIRMATION_REQUESTED",
];

/** "Phase mindestens X": `true`, wenn `phase` gleich `minimum` oder später ist. */
export function isHelperPhaseAtLeast(
  phase: HelperPhase,
  minimum: HelperPhase,
): boolean {
  return (
    HELPER_PHASE_ORDER.indexOf(phase) >= HELPER_PHASE_ORDER.indexOf(minimum)
  );
}

/** Alle Phasen ab `minimum` — für Prisma-Filter (`helperPhase: { in: … }`),
 * damit Query und `isHelperPhaseAtLeast` dieselbe Regel teilen. */
export function helperPhasesAtLeast(minimum: HelperPhase): HelperPhase[] {
  return HELPER_PHASE_ORDER.filter((phase) =>
    isHelperPhaseAtLeast(phase, minimum),
  );
}
