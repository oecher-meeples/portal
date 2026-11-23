import { LanguageDependence, RuleBookLanguage } from "@prisma/client";

/** BGGs 5-stufiges "Language Dependence"-Poll-Modell, deutsch beschriftet
 * (#188) — Reihenfolge entspricht BGGs Poll-Levels 1–5. */
export const LANGUAGE_DEPENDENCE_LABELS: Record<LanguageDependence, string> = {
  [LanguageDependence.NO_NECESSARY_TEXT]: "Kein notwendiger Text im Spiel",
  [LanguageDependence.SOME_NECESSARY_TEXT]:
    "Etwas notwendiger Text – leicht zu merken oder kleiner Spickzettel",
  [LanguageDependence.MODERATE_TEXT]:
    "Mäßig viel Text – Spickzettel oder Aufkleber nötig",
  [LanguageDependence.EXTENSIVE_TEXT]:
    "Umfangreicher Text – aufwändige Übersetzung nötig",
  [LanguageDependence.UNPLAYABLE]: "Unspielbar in einer anderen Sprache",
};

/** BGG-Poll-Level (1–5, siehe `parseLanguageDependence()` in `lib/bgg/client.ts`),
 * in der festen Reihenfolge, in der BGG sie liefert — Index 0 = Level 1. */
export const LANGUAGE_DEPENDENCE_BY_LEVEL: LanguageDependence[] = [
  LanguageDependence.NO_NECESSARY_TEXT,
  LanguageDependence.SOME_NECESSARY_TEXT,
  LanguageDependence.MODERATE_TEXT,
  LanguageDependence.EXTENSIVE_TEXT,
  LanguageDependence.UNPLAYABLE,
];

/** UI-Filterkategorie "Sprachneutral" (#188) — bewusst nur Level 1 (nicht
 * auch Level 2 "leicht zu merken"), da Level 2 noch echten Spieltext enthält.
 * Kann bei Bedarf auf Level 1–2 erweitert werden, siehe Issue-Diskussion. */
export function isLanguageIndependent(
  level: LanguageDependence | null,
): boolean {
  return level === LanguageDependence.NO_NECESSARY_TEXT;
}

/** Kurzform je Poll-Level für den Sprachneutralität-Filter-Slider (Ludothek-
 * Filterpanel) — die vollen `LANGUAGE_DEPENDENCE_LABELS` sind ganze Sätze und
 * sprengen die Slider-Beschriftung. */
export const LANGUAGE_DEPENDENCE_SHORT_LABELS: Record<
  LanguageDependence,
  string
> = {
  [LanguageDependence.NO_NECESSARY_TEXT]: "Sprachneutral",
  [LanguageDependence.SOME_NECESSARY_TEXT]: "Leichter Text",
  [LanguageDependence.MODERATE_TEXT]: "Mäßiger Text",
  [LanguageDependence.EXTENSIVE_TEXT]: "Viel Text",
  [LanguageDependence.UNPLAYABLE]: "Unspielbar",
};

/** Poll-Level (1–5) eines `LanguageDependence`-Werts, Kehrwert zu
 * `LANGUAGE_DEPENDENCE_BY_LEVEL`. */
export function languageDependenceLevel(value: LanguageDependence): number {
  return LANGUAGE_DEPENDENCE_BY_LEVEL.indexOf(value) + 1;
}

export const RULE_BOOK_LANGUAGE_LABELS: Record<RuleBookLanguage, string> = {
  [RuleBookLanguage.DE]: "Deutsch",
  [RuleBookLanguage.EN]: "Englisch",
  [RuleBookLanguage.OTHER]: "Sonstige",
};

/** Kurzform für die Detailseiten-Anzeige je Exemplar, z. B. "DE, EN" (#188). */
export function formatRuleBookLanguages(languages: RuleBookLanguage[]): string {
  return languages.join(", ");
}
