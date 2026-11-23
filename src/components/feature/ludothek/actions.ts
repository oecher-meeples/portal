"use server";

import {
  loadFilteredLudothekGames,
  resolveLudothekBrowseContext,
  toLudothekGamesPage,
  type LudothekGamesPage,
} from "@/lib/ludothek/browse";

/**
 * Lädt die nächste Seite Titel der Ludothek nach (#461). Filter kommen aus
 * denselben `searchParams` wie die Seite selbst, Rechte (intern/Gast,
 * `games:manage`) werden hier neu ermittelt statt dem Client zu glauben —
 * sonst ließen sich Standortdaten über einen manipulierten Aufruf abgreifen.
 */
export async function loadMoreLudothekGames(
  rawSearchParams: Record<string, string | string[] | undefined>,
  offset: number,
): Promise<LudothekGamesPage> {
  if (!Number.isInteger(offset) || offset < 0) {
    return { games: [], nextOffset: null };
  }
  const context = await resolveLudothekBrowseContext(rawSearchParams);
  const { filtered } = await loadFilteredLudothekGames(context);
  return toLudothekGamesPage(filtered, { ...context, offset });
}
