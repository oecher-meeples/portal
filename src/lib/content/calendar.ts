import ical, { type VEvent } from "node-ical";
import {
  getAllContent,
  getUpcomingEvents,
  getUpcomingEventsIncludingInternal,
  type ContentItem,
} from "@/lib/content/content";
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
  if (contentLength > maxBytes) return null;

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
      date: event.start.toISOString().slice(0, 10),
      location: toText(event.location),
    }));
}

/** Never throws — a feed outage must not break whichever calendar rendered next to it. */
async function fetchIcsFeed(
  icsUrl: string | undefined,
  options: { limit?: number; now?: Date } = {},
): Promise<ContentItem[]> {
  if (!icsUrl) return [];

  try {
    const response = await fetch(icsUrl, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return [];

    const icsText = await readCappedIcsBody(response, MAX_ICS_BYTES);
    if (icsText === null) return [];
    return parseCalendarEvents(icsText, options);
  } catch {
    return [];
  }
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

export async function getAllContentWithCalendar(): Promise<ContentItem[]> {
  const [dbItems, calendarEvents, publicEvents] = await Promise.all([
    getAllContent(),
    getUpcomingCalendarEvents(50),
    getPublicDbEvents(50),
  ]);

  return [...dbItems, ...calendarEvents, ...publicEvents].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

/** Public and internal termine together, for the members-only calendar view. */
export async function getInternalCalendarEvents(
  limit = 50,
): Promise<ContentItem[]> {
  const [dbEvents, publicEvents, internalEvents] = await Promise.all([
    getUpcomingEventsIncludingInternal(limit),
    fetchPublicEvents({ limit }),
    fetchInternalEvents({ limit }),
  ]);

  return [...dbEvents, ...publicEvents, ...internalEvents].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
