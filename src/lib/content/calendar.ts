import ical, { type VEvent } from "node-ical";
import { getAllContent, getUpcomingEvents } from "@/lib/content/content";
import type { ContentItem } from "@/lib/content/content-types";
import { findPublicUpcomingEvents } from "@/lib/events/upcoming";

const REVALIDATE_SECONDS = 15 * 60;
const FETCH_TIMEOUT_MS = 8000;
const MAX_ICS_BYTES = 5 * 1024 * 1024;

/**
 * Reads the response body capped at `maxBytes`, aborting the stream rather
 * than buffering it all via `response.text()` first — an ICS feed has no
 * natural size limit, and `ical.parseICS()` runs over whatever comes back.
 * Returns `null` when the cap is exceeded (checked via `Content-Length` and,
 * as a stream falls short of that header, while reading).
 */
async function readCappedIcsBody(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  const contentLength = Number(response.headers?.get?.("content-length") ?? 0);
  if (contentLength > maxBytes) {
    await response.body?.cancel();
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return Buffer.byteLength(text, "utf8") > maxBytes ? null : text;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function toText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "val" in value) {
    return String((value as { val: unknown }).val);
  }
  return undefined;
}

/**
 * Formats an event's start as `YYYY-MM-DD`. Ganztägige ICS-Termine
 * (`DTSTART;VALUE=DATE:...`, z. B. Google-Kalender-„Ganztägig"-Events) haben
 * keine Uhrzeit/Zeitzone — node-ical baut daraus ein `Date` in *lokaler*
 * Serverzeit. `toISOString()` würde das zurück nach UTC rechnen und in
 * Zeitzonen östlich von UTC (Europe/Berlin) einen Tag zurückspringen (Mitternacht
 * 08.09. CEST → 07.09. 22:00 UTC). Für diese Events daher die lokalen
 * Datumskomponenten verwenden statt über UTC zu gehen; getimte Events (mit
 * echtem UTC-Zeitstempel) bleiben bei `toISOString()`.
 */
function formatEventDate(event: VEvent): string {
  const isFullDay = event.datetype === "date" || Boolean(event.start.dateOnly);
  if (!isFullDay) return event.start.toISOString().slice(0, 10);

  const year = event.start.getFullYear();
  const month = String(event.start.getMonth() + 1).padStart(2, "0");
  const day = String(event.start.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseCalendarEvents(
  icsText: string,
  { limit = 3, now = new Date() }: { limit?: number; now?: Date } = {},
): ContentItem[] {
  const parsed = ical.parseICS(icsText);

  return Object.values(parsed)
    .filter(
      (event): event is VEvent =>
        !!event && event.type === "VEVENT" && event.start instanceof Date,
    )
    .filter((event) => event.start >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit)
    .map((event) => ({
      slug: `kalender-${event.uid}`,
      type: "termin" as const,
      title: toText(event.summary) ?? "Termin",
      excerpt: toText(event.description) ?? "",
      body: toText(event.description) ?? "",
      date: formatEventDate(event),
      location: toText(event.location),
    }));
}

/** Never throws — a feed outage must not break whichever calendar rendered
 * next to it. `null` covers every failure mode (missing URL, network error,
 * non-2xx, oversized body) uniformly, since the caller only cares whether a
 * usable ICS body came back.
 *
 * Exported for `/api/calendar/internal/[token]` (#438), das den rohen Feed
 * unverändert durchreicht statt ihn wie hier zu parsen — ein zweiter
 * Fetch/Timeout/Cap-Codepfad wäre eine unnötige Kopie.
 */
export async function fetchRawIcsText(
  icsUrl: string | undefined,
  /** #463: der Existenz-/Sync-Check auf der Beitrags-Detailseite braucht den
   * echten, ungecachten Stand (Termin könnte gerade eben abgesagt worden
   * sein) — die Übersicht (`/news`) bleibt bewusst beim 15-Minuten-Cache. */
  { noCache = false }: { noCache?: boolean } = {},
): Promise<string | null> {
  if (!icsUrl) return null;

  try {
    const response = await fetch(icsUrl, {
      ...(noCache ? { cache: "no-store" } : { next: { revalidate: REVALIDATE_SECONDS } }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }

    return await readCappedIcsBody(response, MAX_ICS_BYTES);
  } catch {
    return null;
  }
}

async function fetchIcsFeed(
  icsUrl: string | undefined,
  options: { limit?: number; now?: Date } = {},
): Promise<ContentItem[]> {
  const icsText = await fetchRawIcsText(icsUrl);
  if (icsText === null) return [];
  return parseCalendarEvents(icsText, options);
}

export async function fetchPublicEvents(
  options: { limit?: number; now?: Date } = {},
): Promise<ContentItem[]> {
  return fetchIcsFeed(process.env.PUBLIC_CALENDAR_ICS_URL, options);
}

/** Marks every event `internal: true` so views can badge and colour them apart. */
export async function fetchInternalEvents(
  options: { limit?: number; now?: Date } = {},
): Promise<ContentItem[]> {
  const events = await fetchIcsFeed(process.env.ICS_FEED_URL_INTERNAL, options);
  return events.map((event) => ({ ...event, internal: true }));
}

export async function getUpcomingCalendarEvents(
  limit = 3,
): Promise<ContentItem[]> {
  return fetchPublicEvents({ limit });
}

export type IcsEventSource = {
  title: string;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  internal: boolean;
};

/**
 * Findet ein VEVENT anhand seiner stabilen `UID`, ungecacht und ohne die
 * `now`-Zukunftsfilterung von `parseCalendarEvents()` — für #463s
 * Existenz-/Sync-Check auf der Beitrags-Detailseite muss auch ein bereits
 * vergangener Termin noch auffindbar sein (sonst würde der zugehörige Post
 * fälschlich einen Tag nach dem Event depubliziert). Prüft öffentlichen und
 * internen Feed, `null` wenn in keinem gefunden (Termin abgesagt/gelöscht
 * oder Feed nicht erreichbar — beide Fälle sind für den Aufrufer identisch:
 * "nicht mehr da").
 */
export async function findIcsEventByUid(
  uid: string,
): Promise<IcsEventSource | null> {
  const feeds: { url: string | undefined; internal: boolean }[] = [
    { url: process.env.PUBLIC_CALENDAR_ICS_URL, internal: false },
    { url: process.env.ICS_FEED_URL_INTERNAL, internal: true },
  ];

  for (const feed of feeds) {
    const icsText = await fetchRawIcsText(feed.url, { noCache: true });
    if (icsText === null) continue;

    const parsed = ical.parseICS(icsText);
    const event = Object.values(parsed).find(
      (component): component is VEvent =>
        !!component &&
        component.type === "VEVENT" &&
        component.uid === uid &&
        component.start instanceof Date,
    );
    if (event) {
      return {
        title: toText(event.summary) ?? "Termin",
        location: toText(event.location) ?? null,
        startsAt: event.start,
        endsAt: event.end instanceof Date ? event.end : null,
        internal: feed.internal,
      };
    }
  }

  return null;
}

export async function getUpcomingEventsWithCalendar(
  limit = 3,
): Promise<ContentItem[]> {
  const fetchSize = Math.max(limit * 3, 10);
  const [dbEvents, calendarEvents] = await Promise.all([
    getUpcomingEvents(fetchSize),
    getUpcomingCalendarEvents(fetchSize),
  ]);

  return [...dbEvents, ...calendarEvents]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

/** Öffentliche `Event`-Datensätze (Sichtbarkeit "Öffentlich", siehe
 * lib/events/visibility.ts) als ContentItem — kein `id`, damit sie wie
 * ICS-Termine nicht-editierbar bleiben (kein zugehöriger Post existiert). */
async function getPublicDbEvents(limit = 50): Promise<ContentItem[]> {
  const events = await findPublicUpcomingEvents(limit);
  return events.map((event) => ({
    slug: `event-${event.slug}`,
    type: "termin" as const,
    title: event.title,
    excerpt: event.location ?? "",
    body: event.location ?? "",
    date: event.startsAt.toISOString().slice(0, 10),
    location: event.location ?? undefined,
  }));
}

export type ContentWithCalendarPage = {
  items: ContentItem[];
  /** True, solange `getAllContent()` noch weitere DB-Posts hätte liefern
   * können (#469) — die ICS-/Event-Quellen sind serverseitig bereits auf
   * ≤50 Einträge gedeckelt und 15 Minuten gecacht, also nie die
   * Performance-Bremse; sie werden weiterhin immer vollständig geladen und
   * fließen unverändert (nicht paginiert) in jede Seite mit ein. */
  hasMore: boolean;
  nextCursor: string | null;
};

/** Internal ICS-Termine fließen immer mit ein — die Sichtbarkeit für
 * unberechtigte Nutzer wird downstream in `/news` (`canSeeInternal`) anhand
 * von `item.internal` gefiltert, nicht hier (analog zu den DB-Beiträgen).
 * `take`/`cursor` (#469, Hybrid-Pagination aus #462): betrifft ausschließlich
 * die DB-Posts. Die ICS-/Event-Quellen werden bewusst nur auf der ersten
 * Seite (kein `cursor`) geladen und eingemischt — "einmalig vollständig
 * geladen" laut Entscheidung, nicht bei jedem Nachladen erneut, sonst
 * erschienen sie auf jeder Folgeseite doppelt. Eine Folgeseite enthält daher
 * ausschließlich die nächste DB-Post-Seite; der Aufrufer hängt sie an die
 * bereits gerenderte, gemischte erste Seite an. */
export async function getAllContentWithCalendar(options?: {
  take?: number;
  cursor?: string;
}): Promise<ContentWithCalendarPage> {
  const { take, cursor } = options ?? {};
  const isFirstPage = cursor === undefined;

  const [dbPage, calendarEvents, publicEvents, internalEvents] =
    await Promise.all([
      getAllContent({ take, cursor }),
      isFirstPage ? getUpcomingCalendarEvents(50) : Promise.resolve([]),
      isFirstPage ? getPublicDbEvents(50) : Promise.resolve([]),
      isFirstPage
        ? fetchInternalEvents({ limit: 50 })
        : Promise.resolve([]),
    ]);

  const items = [
    ...dbPage.items,
    ...calendarEvents,
    ...publicEvents,
    ...internalEvents,
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    items,
    hasMore: dbPage.nextCursor !== null,
    nextCursor: dbPage.nextCursor,
  };
}
