"use server";

import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import { searchEanByName, UpcLookupError } from "@/lib/upc-lookup/client";

/**
 * EAN-Namenssuche für den Anlegen-Wizard (#197) — automatisch beim Wechsel
 * zu Schritt 2 ausgelöst (nur wenn das EAN-Feld leer ist) und manuell über
 * das Lupen-Icon neben dem EAN-Feld, unabhängig vom aktuellen Feldinhalt.
 */
export async function searchEanForBoardGame(title: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  try {
    const results = await searchEanByName(title);
    return { success: true as const, results };
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
