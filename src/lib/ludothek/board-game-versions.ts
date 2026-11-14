import type { BggGameData, BggVersion } from "@/lib/bgg/client";
import type { VersionInput } from "@/lib/ludothek/taxonomy/versions";
import { bggContributorInputs } from "@/lib/ludothek/taxonomy/bgg-contributors";

const GERMAN_LANGUAGE_PATTERN = /german|deutsch/i;

/** Deutsche Editionen, falls vorhanden — sonst alle Versionen (#205). BGGs
 * `language`-Links pro Version sind die Grundlage für die Erkennung, siehe
 * Issue-Klärung ("meist ist die deutsche Edition relevant"). Eingeengt auf
 * die deutschen Editionen erhöht die Chance auf einen eindeutigen
 * Verlag/Product-Code, ohne den Admin fragen zu müssen. */
export function selectRelevantVersions(versions: BggVersion[]): BggVersion[] {
  const german = versions.filter((v) =>
    v.languages.some((lang) => GERMAN_LANGUAGE_PATTERN.test(lang)),
  );
  return german.length > 0 ? german : versions;
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

export type VersionFieldResolution<T> =
  { value: T; needsSelection: false } | { value: null; needsSelection: true };

/**
 * Automatisch übernehmen, wenn der Wert über alle (ggf. auf deutsche
 * Editionen eingeengten) Versionen identisch ist — sonst muss der Admin
 * auswählen (#205). Leere Versionsliste zählt als "kein Wert", nicht als
 * Auswahlbedarf (z. B. Titel ohne separate BGG-Editionen).
 */
export function resolvePublisherFromVersions(
  versions: BggVersion[],
): VersionFieldResolution<string[]> {
  const relevant = selectRelevantVersions(versions);
  if (relevant.length === 0) return { value: [], needsSelection: false };

  const [first, ...rest] = relevant;
  const allSame = rest.every((v) =>
    sameStringArray(v.publisher, first.publisher),
  );
  if (allSame) return { value: first.publisher, needsSelection: false };
  return { value: null, needsSelection: true };
}

/** Sprachen, die alle Versionen teilen — bei deutschen Editionen also
 * `German`. Mischt sich die Sprache (z. B. mehrere Fremdsprachen), bleibt das
 * Ergebnis leer: lieber keine Flagge als die einer Edition, die wir nicht
 * besitzen. */
function commonLanguages(versions: BggVersion[]): string[] {
  const [first, ...rest] = versions;
  if (!first) return [];
  return first.languages.filter((language) =>
    rest.every((version) => version.languages.includes(language)),
  );
}

/** Eine konkrete BGG-Version als Edition des Vereins — Verlage mit BGG-ID. */
export function versionInputFromBgg(version: BggVersion): VersionInput {
  return {
    bggVersionId: version.bggVersionId,
    name: version.name,
    yearPublished: version.yearPublished,
    productCode: version.productCode,
    languages: version.languages,
    publishers: version.publisherLinks.map((link) => ({
      bggId: link.bggId,
      name: link.name,
    })),
  };
}

/**
 * Edition ohne Rückfrage — nur, wenn sie eindeutig ist (#205): genau eine
 * relevante Version, oder mehrere mit identischen Verlagen (dann ohne
 * konkrete Versions-ID, mit den gemeinsamen Sprachen). Sonst `null`: der
 * Admin wählt im Import-Dialog, im Massenimport bleibt die Edition leer.
 */
export function resolveVersionInput(
  versions: BggVersion[],
): VersionInput | null {
  const relevant = selectRelevantVersions(versions);
  if (relevant.length === 0) return null;
  if (relevant.length === 1) return versionInputFromBgg(relevant[0]);
  if (resolvePublisherFromVersions(versions).needsSelection) return null;

  return {
    bggVersionId: null,
    name: null,
    yearPublished: null,
    productCode: resolveProductCodeFromVersions(versions).value,
    languages: commonLanguages(relevant),
    publishers: versionInputFromBgg(relevant[0]).publishers,
  };
}

/**
 * Maps raw `fetchBggGame()`-Daten auf `BoardGameTitleInput`-Shape — von
 * Massenimport (#186) und privatem BGG-Collection-Sync (#255-Folge)
 * gemeinsam genutzt, damit ein neu angelegter Titel in beiden Fällen dieselben
 * Metadaten bekommt (Mechaniken, Gewicht, Spieleranzahl/-dauer, Verlag, …),
 * nicht nur Titel + BGG-ID. Ohne UI zur Konfliktauflösung übernimmt beide
 * Male nur einen eindeutigen Verlag — bei Abweichungen bleibt das Feld leer,
 * korrigierbar im Titel-Editor (#205). Bewusst nicht in `board-games.ts`
 * (dort erzwingt "use server" async Server Actions — dies ist eine reine
 * synchrone Mapping-Funktion).
 */
export function bggDataToTitleInput(bggId: number, data: BggGameData) {
  return {
    title: data.title,
    kind: data.kind,
    bggId,
    minPlayers: data.minPlayers ?? undefined,
    maxPlayers: data.maxPlayers ?? undefined,
    playTimeMinutes: data.playTimeMinutes ?? undefined,
    weight: data.weight ?? undefined,
    averageRating: data.averageRating ?? undefined,
    imageUrl: data.imageUrl ?? undefined,
    description: data.description ?? undefined,
    mechanics: data.mechanics,
    categories: data.categories,
    explainerVideoUrl: data.explainerVideoUrl ?? undefined,
    languageDependence: data.languageDependence,
    version: resolveVersionInput(data.versions) ?? undefined,
    author: data.author,
    contributors: bggContributorInputs(data),
    yearPublished: data.yearPublished ?? undefined,
    traits: data.traits,
  };
}

export function resolveProductCodeFromVersions(
  versions: BggVersion[],
): VersionFieldResolution<string | null> {
  const relevant = selectRelevantVersions(versions);
  const withCode = relevant.filter((v) => v.productCode);
  if (withCode.length === 0) return { value: null, needsSelection: false };

  const [first, ...rest] = withCode;
  const allSame = rest.every((v) => v.productCode === first.productCode);
  if (allSame) return { value: first.productCode, needsSelection: false };
  return { value: null, needsSelection: true };
}
