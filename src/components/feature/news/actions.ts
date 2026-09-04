"use server";

import { getAllContentWithCalendar } from "@/lib/content/calendar";
import {
  filterVisibleNews,
  resolveNewsVisibility,
} from "@/lib/content/news-visibility";
import { getCurrentUser } from "@/lib/auth/server";
import { getSessionTier } from "@/lib/auth/session";

export const NEWS_PAGE_SIZE = 10;

/**
 * Lädt die nächste Seite DB-Posts nach (#470) — Sichtbarkeit wird hier
 * serverseitig neu ermittelt statt dem Client zu vertrauen (`canSeeInternal`
 * ist sicherheitsrelevant: interne Beiträge dürfen nicht über einen
 * manipulierten Client-Parameter sichtbar werden). ICS-/Event-Quellen laufen
 * nur auf der ersten (cursor-losen) Seite mit ein, siehe
 * `getAllContentWithCalendar()`.
 */
export async function loadMoreNews(cursor: string) {
  const [user, sessionTier] = await Promise.all([
    getCurrentUser(),
    getSessionTier(),
  ]);
  const visibility = await resolveNewsVisibility(user, sessionTier);

  const { items, hasMore, nextCursor } = await getAllContentWithCalendar({
    take: NEWS_PAGE_SIZE,
    cursor,
  });

  return {
    items: filterVisibleNews(items, visibility),
    hasMore,
    nextCursor,
  };
}
