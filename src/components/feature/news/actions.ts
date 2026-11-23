"use server";

import { getAllContentWithCalendar } from "@/lib/content/calendar";
import { NEWS_PAGE_SIZE } from "@/lib/content/content-types";
import {
  filterVisibleNews,
  resolveNewsVisibility,
} from "@/lib/content/news-visibility";
import { verifyLinkedEventOrUnpublish as verifyLinkedEventOrUnpublishImpl } from "@/lib/content/termin-posts";
import { getCurrentUser } from "@/lib/auth/server";
import { getSessionTier } from "@/lib/auth/session";
import { findActionActor } from "@/lib/auth/action-guards";
import {
  calendarSubscribeUrl,
  generateMemberCalendarToken,
} from "@/lib/members/calendar-token";
import { revalidateMemberProfile } from "@/lib/members/revalidate-profile";

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

/**
 * Self-Service-Abo für den internen Kalender (#439): erzeugt den Token für
 * das *eigene* Mitglied (nie eine fremde `memberId` vom Client) und gibt die
 * Abo-URL einmalig zurück — in der DB liegt nur der Hash (#438). Ein
 * bestehender Token wird dabei ersetzt; der Client fragt vorher nach.
 */
export async function subscribeOwnInternalCalendar() {
  const actor = await findActionActor("news:internal:view");
  if (!actor) return { error: "Keine Berechtigung." } as const;
  if (!actor.member) {
    return {
      error: "Für dein Konto ist keine Mitgliedschaft hinterlegt.",
    } as const;
  }

  const token = await generateMemberCalendarToken(actor.member.id);
  await revalidateMemberProfile({ memberId: actor.member.id });
  return {
    success: true as const,
    subscribeUrl: calendarSubscribeUrl(token),
  };
}

/**
 * Ungecachter, nicht-blockierender Existenz-/Sync-Check für einen
 * auto-generierten Termin-Beitrag (#463) — von der Beitrags-Detailseite
 * nachgelagert aufgerufen (Inhalt ist bereits gerendert). Keine
 * Berechtigungsprüfung nötig: liest/schreibt nur den einen bereits über
 * `postId` bekannten Post, kein Zugriff auf fremde Daten.
 */
export async function verifyLinkedEventOrUnpublish(postId: string) {
  return verifyLinkedEventOrUnpublishImpl(postId);
}
