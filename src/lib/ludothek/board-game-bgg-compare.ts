import type { BoardGameKind, LanguageDependence } from "@prisma/client";
import type { BggGameData } from "@/lib/bgg/client";
import { parseMechanics } from "@/lib/ludothek/bgg-id";

/** Nur die vergleichbaren Felder, als eigener Typ statt eines Imports aus
 * `components/` — `src/lib` darf nicht aus der UI-Schicht importieren (siehe
 * CLAUDE.md). `BoardGameFormValues` erfüllt diese Form strukturell, jeder
 * Aufruf mit dem echten Formularobjekt bleibt also typsicher. */
type ComparableFormValues = {
  title: string;
  kind: BoardGameKind;
  minPlayers: string;
  maxPlayers: string;
  playTimeMinutes: string;
  weight: string;
  averageRating: string;
  imageUrl: string;
  description: string;
  mechanics: string;
  languageDependence: LanguageDependence | null;
};

/** Felder mit einer 1:1-BGG-Entsprechung — Grundlage für die Randfärbung im
 * "Daten mit BGG abgleichen"-Modus (#189). `ean` und `bggId` und das
 * Erklärvideo (eigene Auswahl-UI seit #185) bleiben bewusst außen vor. `kind`
 * ist seit #202 mit dabei — BGG liefert das `type`-Attribut zuverlässig.
 * `languageDependence` seit #188 — BGGs Community-Poll-Ergebnis. */
export type BoardGameCompareField =
  | "title"
  | "kind"
  | "minPlayers"
  | "maxPlayers"
  | "playTimeMinutes"
  | "weight"
  | "averageRating"
  | "imageUrl"
  | "description"
  | "mechanics"
  | "languageDependence";

function parseFormNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function sameMechanics(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((mechanic, index) => mechanic === sortedB[index]);
}

/**
 * Vergleicht die aktuellen Formularwerte gegen frisch geladene BGG-Daten
 * (#189) — `true` = identisch (grün), `false` = abweichend (rot). Der
 * BGG-Fetch läuft über `previewBggImport()`, liefert also bereits übersetzte
 * Beschreibung/Mechaniken (siehe #184) — Vergleich bleibt Deutsch-zu-Deutsch.
 */
export function compareBoardGameWithBgg(
  form: ComparableFormValues,
  bgg: BggGameData,
): Record<BoardGameCompareField, boolean> {
  return {
    title: form.title.trim() === bgg.title.trim(),
    kind: form.kind === bgg.kind,
    minPlayers: parseFormNumber(form.minPlayers) === bgg.minPlayers,
    maxPlayers: parseFormNumber(form.maxPlayers) === bgg.maxPlayers,
    playTimeMinutes:
      parseFormNumber(form.playTimeMinutes) === bgg.playTimeMinutes,
    weight: parseFormNumber(form.weight) === bgg.weight,
    averageRating: parseFormNumber(form.averageRating) === bgg.averageRating,
    imageUrl: (form.imageUrl.trim() || null) === bgg.imageUrl,
    description:
      (form.description.trim() || null) === (bgg.description ?? null),
    mechanics: sameMechanics(parseMechanics(form.mechanics), bgg.mechanics),
    languageDependence: form.languageDependence === bgg.languageDependence,
  };
}
