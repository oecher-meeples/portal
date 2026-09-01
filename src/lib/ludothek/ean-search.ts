"use server";

import { isValidEan } from "@/lib/inventory/ean";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
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

/**
 * EAN-Namenssuche für den Anlegen-Wizard (#197) — automatisch beim Wechsel
 * zu Schritt 2 ausgelöst (nur wenn das EAN-Feld leer ist) und manuell über
 * das Lupen-Icon neben dem EAN-Feld, unabhängig vom aktuellen Feldinhalt.
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
  options?: { bggProductCode?: string | null; publisher?: string[] },
) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  if (options?.bggProductCode && isValidEan(options.bggProductCode)) {
    return {
      success: true as const,
      results: [
        {
          ean: options.bggProductCode,
          title,
          brand: options.publisher?.[0],
        },
      ],
    };
  }

  try {
    const results = await searchEanByName(title);
    return {
      success: true as const,
      results: options?.publisher?.length
        ? sortByPublisherMatch(results, options.publisher)
        : results,
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
