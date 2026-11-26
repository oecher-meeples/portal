import { prisma } from "@/lib/utils/prisma";
import { searchGamesByName } from "@/lib/spielemeta/client";
import { searchEanByName, type EanSearchResult } from "@/lib/upc-lookup/client";

export type EanCandidateOptions = {
  publisher?: string[];
  /** Der gerade bearbeitete Titel — seine eigenen EANs gelten nicht als vergeben. */
  excludeBoardGameId?: string;
};

/** Treffer mit `brand` passend zu einem der Verlage zuerst — UPCitemdb ist
 * ein US-lastiger Retail-Katalog, der Verlagsname erhöht bei mehreren
 * Kandidaten die Trefferwahrscheinlichkeit deutlich (#205). Stabil sortiert,
 * sonst bleibt die Reihenfolge der Quelle erhalten. */
function sortByPublisherMatch(
  results: EanSearchResult[],
  publisher: string[],
): EanSearchResult[] {
  const normalisedPublishers = publisher.map((p) => p.toLowerCase());
  const matches = (brand: string | undefined) =>
    brand !== undefined &&
    normalisedPublishers.some(
      (p) =>
        p.length > 0 &&
        (brand.toLowerCase().includes(p) || p.includes(brand.toLowerCase())),
    );

  return [...results].sort(
    (a, b) => Number(matches(b.brand)) - Number(matches(a.brand)),
  );
}

/** Marks hits whose EAN already belongs to another title (#668), so callers can skip or disable them. */
export async function markTakenEans(
  results: EanSearchResult[],
  excludeBoardGameId?: string,
): Promise<EanSearchResult[]> {
  if (results.length === 0) return results;
  const owners = await prisma.boardGameEan.findMany({
    where: {
      ean: { in: results.map((result) => result.ean) },
      ...(excludeBoardGameId
        ? { boardGameId: { not: excludeBoardGameId } }
        : {}),
    },
    select: { ean: true, boardGame: { select: { title: true } } },
  });
  const titleByEan = new Map(
    owners.map((owner) => [owner.ean, owner.boardGame.title]),
  );
  return results.map((result) => {
    const takenBy = titleByEan.get(result.ean);
    return takenBy ? { ...result, takenBy } : result;
  });
}

/** Spielemeta first; any failure (401/5xx/timeout/missing key) yields `null` so UPCitemdb takes over. */
async function trySpielemeta(title: string): Promise<EanSearchResult[] | null> {
  try {
    const results = await searchGamesByName(title);
    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

/**
 * Quellen-Reihenfolge (#668): Spielemeta → UPCitemdb (Fallback bei leerem Ergebnis oder Spielemeta-Fehler). Ohne
 * Berechtigungsprüfung — Aufrufer sind selbst geschützt (Server Action bzw.
 * Massenimport). Wirft `UpcLookupError`, wenn auch der Fallback ausfällt.
 */
export async function findEanCandidates(
  title: string,
  options?: EanCandidateOptions,
): Promise<EanSearchResult[]> {
  const sort = (results: EanSearchResult[]) =>
    options?.publisher?.length
      ? sortByPublisherMatch(results, options.publisher)
      : results;

  const spielemeta = await trySpielemeta(title);
  const results = spielemeta ?? (await searchEanByName(title));
  return markTakenEans(sort(results), options?.excludeBoardGameId);
}

const EXPANSION_PATTERN = /erweiterung|expansion/;

function normaliseTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Ohne Rückfrage übernommen werden nur Treffer, die zum gesuchten Titel
 * gehören: der Name beginnt mit dem Titel, und Erweiterungen werden nur
 * zugelassen, wenn der Titel selbst eine ist.
 */
export function matchesSearchedTitle(hitTitle: string, searched: string) {
  const hit = normaliseTitle(hitTitle);
  const wanted = normaliseTitle(searched);
  if (!wanted || !hit.startsWith(wanted)) return false;
  return EXPANSION_PATTERN.test(wanted) || !EXPANSION_PATTERN.test(hit);
}

/**
 * Unbeaufsichtigte Übernahme für den Massenimport: alle noch freien EANs, die
 * die Quelle zum Titel liefert (#668) — ohne fremde Titel und Erweiterungen
 * (`matchesSearchedTitle`). Sucht der Reihe nach mit allen Titeln, bis einer
 * passende Treffer liefert; ein Suchfehler lässt den Import nie scheitern.
 */
export async function findFreeEans(
  titles: string[],
  options?: EanCandidateOptions,
): Promise<string[]> {
  try {
    for (const title of titles) {
      if (!title.trim()) continue;
      const results = (await findEanCandidates(title, options)).filter(
        (result) =>
          !result.takenBy && matchesSearchedTitle(result.title, title),
      );
      if (results.length > 0) return results.map((r) => r.ean);
    }
  } catch {
    return [];
  }
  return [];
}
