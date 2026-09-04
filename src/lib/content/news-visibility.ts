import { hasPermission } from "@/lib/auth/permissions";
import { tierAtLeast, type Tier } from "@/lib/utils/nav-config";
import type { ContentItem } from "@/lib/content/content-types";

export type NewsVisibility = { canSeeInternal: boolean; isMember: boolean };

/**
 * Ob der aktuelle Betrachter interne Beiträge sehen darf und ob Umfragen
 * angezeigt werden (#424) — von der initialen Serverseite (`/news`) und vom
 * Nachlade-Server-Action (#470) gleichermaßen gebraucht, damit beide exakt
 * dieselbe Sichtbarkeit anwenden. Nimmt `user`/`sessionTier` als Parameter
 * statt sie selbst zu laden — beide Aufrufer haben sie ohnehin schon (Server
 * Actions laufen in einem eigenen Request, ein zweiter interner
 * `getCurrentUser()`-Aufruf hier wäre eine unnötige doppelte Session-Abfrage).
 *
 * #10 (Folgefehler beim Live-Test): news:internal:view ist keine
 * Editier-Affordance, sondern eine reguläre Meeple-Berechtigung — daher
 * direkt `hasPermission()`, nicht `hasPermissionInCurrentView()` (das ist
 * laut eigenem Vertrag nur für Admin-only-Affordances gedacht).
 */
export async function resolveNewsVisibility(
  user: { id: string } | null,
  sessionTier: Tier,
): Promise<NewsVisibility> {
  const canSeeInternal =
    user && sessionTier !== "gast"
      ? await hasPermission(user.id, "news:internal:view")
      : false;
  const isMember = tierAtLeast(sessionTier, "mitglied");
  return { canSeeInternal, isMember };
}

/** Wendet dieselben zwei Filter an, die `/news` schon immer angewendet hat
 * (#424): interne Beiträge nur mit Berechtigung, Umfragen nur für Meeple. */
export function filterVisibleNews(
  items: ContentItem[],
  { canSeeInternal, isMember }: NewsVisibility,
): ContentItem[] {
  return items
    .filter((item) => canSeeInternal || !item.internal)
    .filter((item) => isMember || item.type !== "umfrage");
}
