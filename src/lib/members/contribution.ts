import type { Prisma } from "@prisma/client";

/**
 * Beitragsart eines Vereinsmitglieds, abgeleitet aus `birthDate` — oder
 * `"individuell"`, wenn ein `selbstgewaehlterBeitrag` die Alters-Kategorie
 * überstimmt (#328), aber kein Geburtsdatum vorliegt, um sie stattdessen zu
 * bestimmen.
 */
export type ContributionCategory = "mini" | "jung" | "meeple" | "individuell";

export const CONTRIBUTION_CATEGORY_LABELS: Record<
  ContributionCategory,
  string
> = {
  mini: "MiniMeeple (ermäßigter Kinderbeitrag)",
  jung: "JungMeeple (ermäßigter Jugendbeitrag)",
  meeple: "Meeple (regulärer Beitrag)",
  individuell: "Individueller Beitrag",
};

/** Unter 13 ist der Beitrag laut Vorstandsbeschluss immer 0 € (#328-Akzeptanzkriterium). */
const MINI_MEEPLE_CONTRIBUTION_EUROS = 0;

/** Altersgrenzen aus #328: Kind < 13, Jugend 13–18, Einzel > 18. */
const JUNG_MEEPLE_MIN_AGE = 13;
const MEEPLE_MIN_AGE = 18;

export type ContributionDetermination =
  | {
      category: ContributionCategory;
      amountEuros: number | null;
      /** Woher `category`/`amountEuros` stammen — für UI-Erklärtexte. */
      source: "birthDate" | "selbstgewaehlterBeitrag";
    }
  | { category: null; amountEuros: null; source: null };

function ageInYears(birthDate: Date, now: Date): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthdayThisYear =
    now.getUTCMonth() < birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() &&
      now.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthdayThisYear) age -= 1;
  return age;
}

function categoryForAge(age: number): ContributionCategory {
  if (age < JUNG_MEEPLE_MIN_AGE) return "mini";
  if (age < MEEPLE_MIN_AGE) return "jung";
  return "meeple";
}

function decimalToNumber(value: number | Prisma.Decimal): number {
  return typeof value === "number" ? value : Number(value);
}

/**
 * Bestimmt die Beitragsart eines Vereinsmitglieds. `selbstgewaehlterBeitrag`
 * überstimmt immer die aus `birthDate` abgeleitete Alters-Kategorie (#328) —
 * ist kein Geburtsdatum bekannt, wird die Kategorie dann als `"individuell"`
 * geführt, statt eine Alters-Kategorie zu raten.
 *
 * Ohne `birthDate` UND ohne `selbstgewaehlterBeitrag` bleibt die Beitragsart
 * bewusst unbestimmt (`category: null`) — kein Rateversuch.
 *
 * Nur die Kind-Kategorie hat einen vom Vorstand bestätigten festen Betrag
 * (0 €). Für Jugend/Einzel ist die Beitragshöhe noch nicht beziffert
 * (`docs/mitglieder-konzept.md`, Stand dieses Pakets) — ohne eigenen
 * `selbstgewaehlterBeitrag` bleibt `amountEuros` dort `null` statt geraten.
 */
export function determineContribution(
  member: {
    birthDate: Date | null;
    selbstgewaehlterBeitrag: number | Prisma.Decimal | null;
  },
  now: Date = new Date(),
): ContributionDetermination {
  if (
    member.selbstgewaehlterBeitrag !== null &&
    member.selbstgewaehlterBeitrag !== undefined
  ) {
    return {
      category: "individuell",
      amountEuros: decimalToNumber(member.selbstgewaehlterBeitrag),
      source: "selbstgewaehlterBeitrag",
    };
  }

  if (!member.birthDate) {
    return { category: null, amountEuros: null, source: null };
  }

  const category = categoryForAge(ageInYears(member.birthDate, now));
  return {
    category,
    amountEuros: category === "mini" ? MINI_MEEPLE_CONTRIBUTION_EUROS : null,
    source: "birthDate",
  };
}
