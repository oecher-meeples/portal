import type { GameZustand } from "@/lib/ludothek/holdings-lookup";

/**
 * Welche Aktion an einem Exemplar gerade Sinn ergibt (#548) — eine Regel für
 * das Aktionsmenü der Exemplar-Liste und die Quick-Actions der
 * Detailseite mit vorausgewähltem Exemplar. Die Server Actions prüfen
 * weiterhin selbst; das hier blendet nur aus, was ohnehin scheitern würde
 * oder fachlich unsinnig ist (z. B. etwas zurückgeben, das man nicht hat).
 */

export type CopyActionKey =
  | "borrow"
  | "give"
  | "return"
  | "relocate"
  | "completeness-check"
  | "condition"
  | "deinventorise";

export const COPY_ACTION_LABELS: Record<CopyActionKey, string> = {
  borrow: "Ausleihen",
  give: "Weitergeben",
  return: "Rückgabe",
  relocate: "Umlagern",
  "completeness-check": "Prüfung anfordern",
  condition: "Exemplar bearbeiten",
  deinventorise: "Deinventarisieren",
};

/** Aufenthalts-Aktionen — für jeden Meeple, je nach Zustand. */
export const AUFENTHALT_ACTIONS = [
  "borrow",
  "give",
  "return",
  "relocate",
] as const satisfies readonly CopyActionKey[];

/** Verwaltungs-Aktionen — nur mit `games:manage`. */
export const VERWALTUNG_ACTIONS = [
  "completeness-check",
  "condition",
  "deinventorise",
] as const satisfies readonly CopyActionKey[];

export type CopyActionSubject = {
  zustand: GameZustand;
  /** Ob die aktuelle Session das Exemplar gerade hält (#128). Fehlt der
   * Wert, gilt das bisherige Verhalten: nicht einschränken. */
  isMine?: boolean;
};

export type CopyActionContext = { canManageGames: boolean };

function isHeldByPerson(zustand: GameZustand): boolean {
  return (
    zustand === "ausgeliehen-verfuegbar" ||
    zustand === "ausgeliehen-nicht-verfuegbar"
  );
}

/** Liegt verfügbar in einer Einheit (inkl. „Unsortiert") — Voraussetzung
 * fürs Ausleihen (`borrowGame` braucht eine Einheit als Ausgangspunkt). */
function isBorrowable(zustand: GameZustand): boolean {
  return zustand === "frei" || zustand === "nicht-erfasst";
}

export function isCopyActionAvailable(
  action: CopyActionKey,
  copy: CopyActionSubject,
  { canManageGames }: CopyActionContext,
): boolean {
  // Privatbesitz hat kein echtes `GameCopy` dahinter — keine Aktionen.
  if (copy.zustand === "privat") return false;

  switch (action) {
    case "borrow":
      return isBorrowable(copy.zustand);
    // Umlagern geht von einer Einheit aus (`relocateGame`) — auch ein
    // Exemplar in Wartung lässt sich umlagern, ein verliehenes nicht.
    case "relocate":
      return !isHeldByPerson(copy.zustand);
    // Weitergeben setzt eine haltende Person voraus (#405); ein normaler
    // Meeple nur eigene Exemplare, `games:manage` jedes (#274/#290).
    case "give":
      return (
        isHeldByPerson(copy.zustand) &&
        (canManageGames || (copy.isMine ?? true))
      );
    case "return":
      return isHeldByPerson(copy.zustand);
    case "completeness-check":
    case "condition":
    case "deinventorise":
      return canManageGames;
  }
}

/** Die verfügbaren Aktionen eines Exemplars in fester Reihenfolge. */
export function availableCopyActions(
  copy: CopyActionSubject,
  context: CopyActionContext,
  actions: readonly CopyActionKey[] = [
    ...AUFENTHALT_ACTIONS,
    ...VERWALTUNG_ACTIONS,
  ],
): CopyActionKey[] {
  return actions.filter((action) =>
    isCopyActionAvailable(action, copy, context),
  );
}
