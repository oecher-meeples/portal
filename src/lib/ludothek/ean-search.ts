"use server";

import { findActionActor } from "@/lib/auth/action-guards";
import { isValidEan } from "@/lib/inventory/ean";
import { prisma } from "@/lib/utils/prisma";
import { searchGamesByName } from "@/lib/spielemeta/client";
import {
  searchEanByName,
  UpcLookupError,
  type EanSearchResult,
} from "@/lib/upc-lookup/client";

/** Treffer mit `brand` passend zu einem der Verlage zuerst — UPCitemdb ist
 * ein US-lastiger Retail-Katalog, der Verlagsname erhöht bei mehreren
 * Kandidaten die Trefferwahrscheinlichkeit deutlich (#205). Stabil sortiert,
 * sonst bleibt UPCitemdbs eigene Reihenfolge erhalten. */
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

/** Marks hits whose EAN already belongs to another title (#668), so the UI can disable them. */
async function markTakenEans(
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
 * EAN-Namenssuche für den Anlegen-Wizard (#197) — automatisch beim Wechsel
 * zu Schritt 2 ausgelöst (nur wenn das EAN-Feld leer ist) und manuell über
 * das Lupen-Icon neben dem EAN-Feld, unabhängig vom aktuellen Feldinhalt.
 *
 * Reihenfolge (#668): gültiger BGG-Product-Code → Spielemeta → UPCitemdb
 * (Fallback bei leerem Ergebnis oder Spielemeta-Fehler). Treffer, deren EAN
 * schon einem anderen Titel gehört, tragen `takenBy`.
 *
 * Liegt ein eindeutiger, **gültiger** BGG-Product-Code vor
 * (`resolveProductCodeFromVersions()`), hat er Vorrang vor UPCitemdb (#205)
 * — der Code ist meist die echte Verpackungs-EAN. Erweist er sich als
 * ungültig (z. B. enthält Buchstaben, keine gültige Prüfziffer), fällt die
 * Suche stattdessen auf UPCitemdb zurück, statt ihn ungeprüft zu übernehmen
 * (#322). Ohne brauchbaren Product-Code bleibt UPCitemdb wie bisher die
 * Quelle, deren Kandidaten nach passendem Verlag sortiert werden.
 */
export async function searchEanForBoardGame(
  title: string,
  options?: {
    bggProductCode?: string | null;
    publisher?: string[];
    /** Der gerade bearbeitete Titel — seine eigenen EANs gelten nicht als vergeben. */
    excludeBoardGameId?: string;
  },
) {
  const user = (await findActionActor("games:manage"))?.user;
  if (!user) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  if (options?.bggProductCode && isValidEan(options.bggProductCode)) {
    return {
      success: true as const,
      results: await markTakenEans(
        [
          {
            ean: options.bggProductCode,
            title,
            brand: options.publisher?.[0],
          },
        ],
        options.excludeBoardGameId,
      ),
    };
  }

  const sort = (results: EanSearchResult[]) =>
    options?.publisher?.length
      ? sortByPublisherMatch(results, options.publisher)
      : results;

  const spielemeta = await trySpielemeta(title);
  if (spielemeta) {
    return {
      success: true as const,
      results: await markTakenEans(
        sort(spielemeta),
        options?.excludeBoardGameId,
      ),
    };
  }

  try {
    const results = await searchEanByName(title);
    return {
      success: true as const,
      results: await markTakenEans(sort(results), options?.excludeBoardGameId),
    };
  } catch (error) {
    if (error instanceof UpcLookupError) {
      return {
        success: false as const,
        error:
          "Die EAN-Suche ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
      };
    }
    throw error;
  }
}
