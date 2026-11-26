"use server";

import { findActionActor } from "@/lib/auth/action-guards";
import {
  findEanCandidates,
  type EanCandidateOptions,
} from "@/lib/ludothek/ean-candidates";
import { UpcLookupError } from "@/lib/upc-lookup/client";

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
  options?: EanCandidateOptions,
) {
  const user = (await findActionActor("games:manage"))?.user;
  if (!user) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  try {
    return {
      success: true as const,
      results: await findEanCandidates(title, options),
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
