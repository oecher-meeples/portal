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
 * Reihenfolge (#668): Spielemeta → UPCitemdb (Fallback bei leerem Ergebnis
 * oder Spielemeta-Fehler), Kandidaten nach passendem Verlag sortiert. Der
 * BGG-Product-Code ist bewusst keine Quelle mehr — er entspricht meist
 * nicht der EAN. Treffer, deren EAN schon einem anderen Titel gehört,
 * tragen `takenBy`.
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
