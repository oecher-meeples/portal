"use server";

import {
  BggApiError,
  BggNotFoundError,
  fetchBggGame,
  searchBggGames,
  type BggGameData,
  type BggSearchResult,
} from "@/lib/bgg/client";
import { translateToGerman } from "@/lib/bgg/translate";
import { translateMechanics } from "@/lib/ludothek/mechanics-translations";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import { searchYoutubeVideos } from "@/lib/youtube/client";

export async function searchBggGamesAction(query: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  try {
    const results: BggSearchResult[] = await searchBggGames(query);
    return { success: true as const, results };
  } catch (error) {
    if (error instanceof BggApiError) {
      return {
        success: false as const,
        error:
          "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
      };
    }
    throw error;
  }
}

/**
 * Übersetzt die BGG-Rohdaten ins Deutsche (#184), bevor der Titel überhaupt
 * angelegt werden kann — ein eigener Schritt nach `fetchBggGame()`, nicht in
 * `mapItem()` verdrahtet, damit die englischen BGG-Fixtures/-Tests
 * unverändert bleiben. Mechaniken laufen über die feste Tabelle, die
 * Beschreibung über die MyMemory-API. Schlägt die Übersetzung fehl (z. B.
 * MyMemorys knappes Tageslimit ohne `TRANSLATION_CONTACT_EMAIL`), bleibt der
 * englische Original-Text stehen statt die Beschreibung leer zu lassen —
 * so geht beim Import nichts verloren, der Admin übersetzt später über den
 * "Übersetzen"-Button im Titel-Editor (`translateDescription()` unten).
 */
async function translateBggGameData(
  data: BggGameData,
): Promise<{ data: BggGameData; descriptionTranslationFailed: boolean }> {
  const mechanics = translateMechanics(data.mechanics);

  if (!data.description) {
    return {
      data: { ...data, mechanics },
      descriptionTranslationFailed: false,
    };
  }

  try {
    const description = await translateToGerman(data.description);
    return {
      data: { ...data, description, mechanics },
      descriptionTranslationFailed: false,
    };
  } catch (error) {
    console.warn(
      "Übersetzung fehlgeschlagen — Beschreibung bleibt vorerst auf Englisch.",
      error,
    );
    return {
      data: { ...data, mechanics },
      descriptionTranslationFailed: true,
    };
  }
}

/**
 * Übersetzt einen frei editierten Beschreibungstext auf Knopfdruck — für den
 * "Übersetzen"-Button im Titel-Editor (#184-Folgeanfrage), z. B. wenn die
 * automatische Übersetzung beim Import fehlgeschlagen ist oder ein Titel
 * manuell mit englischem Text angelegt wurde.
 */
export async function translateDescription(text: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  if (!text.trim()) {
    return {
      success: false as const,
      error: "Keine Beschreibung zum Übersetzen vorhanden.",
    };
  }

  try {
    const translated = await translateToGerman(text);
    return { success: true as const, text: translated };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Die Übersetzung ist fehlgeschlagen. Bitte erneut versuchen.",
    };
  }
}

export type ExplainerVideoSource = "bgg-german" | "youtube" | "bgg-fallback";

/**
 * Lädt die Video-Kandidaten für den "Video aktualisieren"-Button im Titel-
 * Editor (#185-Folgeanfrage) — z. B. wenn seit dem Import ein neues
 * deutschsprachiges Regelvideo erschienen ist. Nur der Video-Teil von
 * `fetchBggGame()`, keine Beschreibung/Mechaniken-Übersetzung nötig.
 *
 * Reihenfolge: 1) BGGs deutschsprachige Treffer, falls vorhanden. 2) Sonst
 * eine direkte YouTube-Suche nach "<Titel> Regeln" — BGGs `videos`-Block
 * zeigt je Titel nur die ~15 aktuellsten Einträge, ein existierendes
 * deutsches Video kann also außerhalb dieses Fensters liegen (live bestätigt,
 * siehe #185-Diskussion). 3) Sonst BGGs englischsprachige (oder sprachlose,
 * siehe `selectEnglishExplainerVideos()`) Treffer — nur Deutsch und Englisch
 * gelten als Fallback, andere Sprachen werden nicht angezeigt
 * (#185-Folgeanfrage). In jedem Fall wählt der Admin bewusst aus der Liste —
 * nichts wird automatisch übernommen.
 */
export async function fetchExplainerVideoOptions(bggId: number) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  try {
    const data = await fetchBggGame(bggId);
    if (data.germanExplainerVideos.length > 0) {
      return {
        success: true as const,
        videos: data.germanExplainerVideos,
        source: "bgg-german" as ExplainerVideoSource,
      };
    }

    try {
      const youtubeResults = await searchYoutubeVideos(`${data.title} Regeln`);
      if (youtubeResults.length > 0) {
        return {
          success: true as const,
          videos: youtubeResults,
          source: "youtube" as ExplainerVideoSource,
        };
      }
    } catch (error) {
      console.warn(
        "YouTube-Suche fehlgeschlagen, falle auf BGG-Fallback zurück.",
        error,
      );
    }

    return {
      success: true as const,
      videos: data.englishExplainerVideos,
      source: "bgg-fallback" as ExplainerVideoSource,
    };
  } catch (error) {
    if (error instanceof BggNotFoundError) {
      return { success: false as const, error: error.message };
    }
    if (error instanceof BggApiError) {
      return {
        success: false as const,
        error:
          "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
      };
    }
    throw error;
  }
}

export async function previewBggImport(bggId: number) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { success: false as const, error: "Keine Berechtigung." };
  }

  try {
    const rawData: BggGameData = await fetchBggGame(bggId);
    const { data, descriptionTranslationFailed } =
      await translateBggGameData(rawData);
    return {
      success: true as const,
      data,
      hint: descriptionTranslationFailed
        ? "Automatische Übersetzung der Beschreibung ist fehlgeschlagen — Beschreibung ist vorerst auf Englisch, bitte über den „Übersetzen“-Button oder manuell auf Deutsch ergänzen."
        : undefined,
    };
  } catch (error) {
    if (error instanceof BggNotFoundError) {
      return { success: false as const, error: error.message };
    }
    if (error instanceof BggApiError) {
      return {
        success: false as const,
        error:
          "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
      };
    }
    throw error;
  }
}
