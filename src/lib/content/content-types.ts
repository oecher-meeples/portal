/**
 * Client-sichere Typen/Konstanten für Content-Items (Blog/Termin/Turnier/
 * Umfrage) — bewusst getrennt von content.ts (#470-Folgefehler): content.ts
 * importiert `prisma` auf Modulebene, Turbopack kann das beim Bundling für
 * Client-Komponenten nicht tree-shaken ("does not support external modules
 * (request: node:fs)"). Alles, was Client-Komponenten per Werte-Import
 * braucht (nicht nur `import type`), muss deshalb aus dieser Datei kommen.
 */

export type ContentType = "termin" | "blog" | "turnier" | "umfrage";

/** Seitengröße für das Nachladen im News-Feed (#470). */
export const NEWS_PAGE_SIZE = 10;

export const CONTENT_TYPE_FILTERS: { label: string; value: ContentType | "alle" }[] = [
  { label: "Alle", value: "alle" },
  { label: "Termine", value: "termin" },
  { label: "Blog", value: "blog" },
  { label: "Turniere", value: "turnier" },
  { label: "Umfragen", value: "umfrage" },
];

export type ContentItem = {
  /** Only set for DB-backed posts — absent for ICS-sourced calendar events. */
  id?: string;
  slug: string;
  type: ContentType;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  author?: string;
  location?: string;
  internal?: boolean;
  instagram?: boolean;
  instagramPostUrl?: string;
  coverImageUrl?: string;
  /** Nur bei `type: "umfrage"` gesetzt — steuert das Deadline-Banner auf der
   * Detailseite (#2). `editLink`/`analysisLink` sind bewusst NICHT Teil von
   * `ContentItem`: sensibel, nur im Admin-Editor sichtbar (siehe
   * post-permissions.ts), nie auf `/news`. */
  surveyDeadline?: string;
  /** True für einen automatisch aus einem Termin erzeugten Beitrag (#463,
   * `Post.sourceIcsUid`/`sourceEventId` gesetzt) — steuert, ob die
   * Detailseite den nachgelagerten Existenz-/Sync-Check auslöst. */
  hasEventSource?: boolean;
};

export const TYPE_TO_DB: Record<
  ContentType,
  "BLOG" | "TERMIN" | "TURNIER" | "UMFRAGE"
> = {
  blog: "BLOG",
  termin: "TERMIN",
  turnier: "TURNIER",
  umfrage: "UMFRAGE",
};

export const DB_TO_TYPE: Record<
  "BLOG" | "TERMIN" | "TURNIER" | "UMFRAGE",
  ContentType
> = {
  BLOG: "blog",
  TERMIN: "termin",
  TURNIER: "turnier",
  UMFRAGE: "umfrage",
};

export type PaginatedContent = {
  items: ContentItem[];
  /** Post-Id der letzten Zeile dieser Seite — als `cursor` an den nächsten
   * Aufruf übergeben. `null`, wenn es keine weiteren DB-Posts gibt (#469). */
  nextCursor: string | null;
};

/** Interne Beiträge brauchen news:internal:view (nicht nur eine Session) — used to gate the detail page. */
export function canViewContentItem(
  item: Pick<ContentItem, "internal">,
  canViewInternal: boolean,
) {
  return !item.internal || canViewInternal;
}
