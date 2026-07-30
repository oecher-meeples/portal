import ical, { type VEvent } from "node-ical";
import {
  getAllContent,
  getUpcomingEvents,
  getUpcomingEventsIncludingInternal,
  type ContentItem,
} from "@/lib/content/content";

const REVALIDATE_SECONDS = 15 * 60;

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
    });
    if (!response.ok) return [];

    const icsText = await response.text();
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

export async function getAllContentWithCalendar(): Promise<ContentItem[]> {
  const [dbItems, calendarEvents] = await Promise.all([
    getAllContent(),
    getUpcomingCalendarEvents(50),
  ]);

  return [...dbItems, ...calendarEvents].sort((a, b) =>
    a.date.localeCompare(b.date),
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
