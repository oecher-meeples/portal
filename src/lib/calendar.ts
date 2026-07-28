import ical, { type VEvent } from "node-ical";
import {
  getAllContent,
  getUpcomingEvents,
  type ContentItem,
} from "@/lib/content";

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

export async function getUpcomingCalendarEvents(
  limit = 3,
): Promise<ContentItem[]> {
  const icsUrl = process.env.PUBLIC_CALENDAR_ICS_URL;
  if (!icsUrl) return [];

  const response = await fetch(icsUrl, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) return [];

  const icsText = await response.text();
  return parseCalendarEvents(icsText, { limit });
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
