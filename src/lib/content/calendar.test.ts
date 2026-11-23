import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content/content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content/content")>()),
  getAllContent: vi.fn(),
}));
vi.mock("@/lib/events/upcoming", () => ({
  findPublicUpcomingEvents: vi.fn().mockResolvedValue([]),
}));

const { getAllContent } = await import("@/lib/content/content");
const {
  fetchInternalEvents,
  fetchPublicEvents,
  findIcsEventByUid,
  getAllContentWithCalendar,
  parseCalendarEvents,
} = await import("@/lib/content/calendar");

const FIXTURE = fs.readFileSync(
  path.join(__dirname, "..", "__fixtures__", "calendar.ics"),
  "utf-8",
);

const REFERENCE_NOW = new Date("2026-07-01T00:00:00Z");

describe("parseCalendarEvents", () => {
  it("parses VEVENTs into ContentItem-shaped calendar entries", () => {
    const events = parseCalendarEvents(FIXTURE, { now: REFERENCE_NOW });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      type: "termin",
      title: "Offener Spieleabend",
      date: "2026-08-10",
      location: "Vereinsheim Aachen",
    });
  });

  // #10 (Folgefehler beim Live-Test): Ganztägige ICS-Events
  // (DTSTART;VALUE=DATE:...) tragen keine Zeitzone. node-ical baut daraus ein
  // Date in lokaler Serverzeit — vorher rechnete parseCalendarEvents das über
  // toISOString() nach UTC um und sprang in Europe/Berlin einen Tag zurück
  // (08.09. wurde als 07.09. angezeigt).
  it("keeps the calendar date for full-day events instead of shifting via UTC", () => {
    const events = parseCalendarEvents(FIXTURE, { now: REFERENCE_NOW });

    const fullDayEvent = events.find(
      (event) => event.title === "Ganztaegiger Spieltag",
    );
    expect(fullDayEvent?.date).toBe("2026-09-08");
  });

  it("excludes events that already happened", () => {
    const events = parseCalendarEvents(FIXTURE, { now: REFERENCE_NOW });

    expect(
      events.some((event) => event.title === "Vergangener Spieleabend"),
    ).toBe(false);
  });

  it("respects the limit parameter", () => {
    const events = parseCalendarEvents(FIXTURE, {
      now: new Date("2026-01-01T00:00:00Z"),
      limit: 1,
    });

    expect(events).toHaveLength(1);
  });
});

describe("getAllContentWithCalendar", () => {
  afterEach(() => {
    delete process.env.PUBLIC_CALENDAR_ICS_URL;
    delete process.env.ICS_FEED_URL_INTERNAL;
    vi.unstubAllGlobals();
  });

  it("sorts entries descending by date, newest first (#252)", async () => {
    vi.mocked(getAllContent).mockResolvedValue({
      items: [
        { slug: "alt", type: "blog", title: "Alt", date: "2026-06-01" },
        { slug: "neu", type: "blog", title: "Neu", date: "2026-08-01" },
      ],
      nextCursor: null,
    } as Awaited<ReturnType<typeof getAllContent>>);

    const { items } = await getAllContentWithCalendar();

    expect(items.map((item) => item.date)).toEqual([
      "2026-08-01",
      "2026-06-01",
    ]);
  });

  it("includes internal ICS-Termine, marked internal (#208)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(REFERENCE_NOW);
    try {
      vi.mocked(getAllContent).mockResolvedValue({
        items: [],
        nextCursor: null,
      });
      process.env.ICS_FEED_URL_INTERNAL = "https://example.org/internal.ics";
      mockFetchOnce(true, FIXTURE);

      const { items } = await getAllContentWithCalendar();

      const internalItem = items.find((item) =>
        item.slug.startsWith("kalender-"),
      );
      expect(internalItem?.internal).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  // #469, AC 1: eine DB-Post-Seite muss mit den vollständig geladenen
  // ICS-/Event-Daten nach Datum korrekt gemischt bleiben, nicht nur
  // hintereinandergehängt.
  it("merges a paginated DB-post page with the fully-loaded ICS calendar, staying sorted by date (#469)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(REFERENCE_NOW);
    try {
      vi.mocked(getAllContent).mockResolvedValue({
        items: [
          { slug: "db-neu", type: "blog", title: "DB Neu", date: "2026-09-01" },
          { slug: "db-alt", type: "blog", title: "DB Alt", date: "2026-07-01" },
        ] as Awaited<ReturnType<typeof getAllContent>>["items"],
        nextCursor: "db-alt",
      });
      process.env.PUBLIC_CALENDAR_ICS_URL = "https://example.org/public.ics";
      mockFetchOnce(true, FIXTURE);

      const { items, hasMore, nextCursor } = await getAllContentWithCalendar();

      expect(items.map((item) => item.slug)).toEqual([
        "kalender-event-3@google.com",
        "db-neu",
        "kalender-event-1@google.com",
        "db-alt",
      ]);
      expect(hasMore).toBe(true);
      expect(nextCursor).toBe("db-alt");
    } finally {
      vi.useRealTimers();
    }
  });

  // #469, AC 2: über mehrere Seiten hinweg dürfen die DB-Posts weder
  // doppelt noch mit Lücke erscheinen — die ICS-/Event-Quellen (nur auf
  // Seite 1 geladen) dürfen dabei nicht erneut auftauchen.
  it("carries no duplicates and no gaps across consecutive DB-post pages (#469)", async () => {
    vi.mocked(getAllContent).mockImplementation(async (options) => {
      if (options?.cursor === undefined) {
        return {
          items: [
            { slug: "post-3", type: "blog", title: "3", date: "2026-08-03" },
          ] as Awaited<ReturnType<typeof getAllContent>>["items"],
          nextCursor: "post-3",
        };
      }
      return {
        items: [
          { slug: "post-2", type: "blog", title: "2", date: "2026-08-02" },
        ] as Awaited<ReturnType<typeof getAllContent>>["items"],
        nextCursor: null,
      };
    });

    const firstPage = await getAllContentWithCalendar({ take: 1 });
    expect(firstPage.hasMore).toBe(true);
    const secondPage = await getAllContentWithCalendar({
      take: 1,
      cursor: firstPage.nextCursor ?? undefined,
    });
    expect(secondPage.hasMore).toBe(false);

    const allSlugs = [...firstPage.items, ...secondPage.items].map(
      (item) => item.slug,
    );
    expect(allSlugs).toEqual(["post-3", "post-2"]);
    expect(new Set(allSlugs).size).toBe(allSlugs.length);
  });
});

function mockFetchOnce(ok: boolean, text: string, headers?: HeadersInit) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    text: async () => text,
    headers: new Headers(headers),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("findIcsEventByUid (#463)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PUBLIC_CALENDAR_ICS_URL;
    delete process.env.ICS_FEED_URL_INTERNAL;
  });

  it("finds an already-past event, unlike parseCalendarEvents (no now-filter)", async () => {
    process.env.PUBLIC_CALENDAR_ICS_URL = "https://example.org/public.ics";
    mockFetchOnce(true, FIXTURE);

    const result = await findIcsEventByUid("event-2@google.com");

    expect(result).toMatchObject({
      title: "Vergangener Spieleabend",
      internal: false,
    });
  });

  it("checks the internal feed when the uid isn't in the public one", async () => {
    process.env.PUBLIC_CALENDAR_ICS_URL = "https://example.org/public.ics";
    process.env.ICS_FEED_URL_INTERNAL = "https://example.org/internal.ics";
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        text: async () => (url.includes("internal") ? FIXTURE : ""),
        headers: new Headers(),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await findIcsEventByUid("event-1@google.com");

    expect(result).toMatchObject({ title: "Offener Spieleabend", internal: true });
  });

  it("returns null when the uid is in neither feed (event cancelled/deleted)", async () => {
    process.env.PUBLIC_CALENDAR_ICS_URL = "https://example.org/public.ics";
    mockFetchOnce(true, FIXTURE);

    expect(await findIcsEventByUid("unknown-uid")).toBeNull();
  });

  it("returns null (not a crash) when both feeds are unreachable", async () => {
    process.env.PUBLIC_CALENDAR_ICS_URL = "https://example.org/public.ics";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    expect(await findIcsEventByUid("event-1@google.com")).toBeNull();
  });
});

describe("fetchInternalEvents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ICS_FEED_URL_INTERNAL;
  });

  it("parses the internal feed and marks every event internal", async () => {
    process.env.ICS_FEED_URL_INTERNAL = "https://example.org/internal.ics";
    mockFetchOnce(true, FIXTURE);

    const events = await fetchInternalEvents({ now: REFERENCE_NOW });

    expect(events).toHaveLength(2);
    expect(events.every((event) => event.internal)).toBe(true);
  });

  it("returns an empty list without throwing when the env var is missing", async () => {
    delete process.env.ICS_FEED_URL_INTERNAL;

    await expect(fetchInternalEvents()).resolves.toEqual([]);
  });

  it("returns an empty list without throwing on a network error", async () => {
    process.env.ICS_FEED_URL_INTERNAL = "https://example.org/internal.ics";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    await expect(fetchInternalEvents()).resolves.toEqual([]);
  });

  it("returns an empty list without throwing when the feed exceeds the size cap", async () => {
    process.env.ICS_FEED_URL_INTERNAL = "https://example.org/internal.ics";
    mockFetchOnce(true, FIXTURE, {
      "content-length": String(6 * 1024 * 1024),
    });

    await expect(fetchInternalEvents()).resolves.toEqual([]);
  });

  it("returns an empty list when the body exceeds the cap despite a missing Content-Length", async () => {
    process.env.ICS_FEED_URL_INTERNAL = "https://example.org/internal.ics";
    const oversizedText = "x".repeat(6 * 1024 * 1024);
    mockFetchOnce(true, oversizedText);

    await expect(fetchInternalEvents()).resolves.toEqual([]);
  });
});

describe("fetchPublicEvents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PUBLIC_CALENDAR_ICS_URL;
    delete process.env.ICS_FEED_URL_INTERNAL;
  });

  it("a network error on the internal feed does not break the public calendar", async () => {
    process.env.PUBLIC_CALENDAR_ICS_URL = "https://example.org/public.ics";
    process.env.ICS_FEED_URL_INTERNAL = "https://example.org/internal.ics";

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("internal")) {
        return Promise.reject(new Error("network down"));
      }
      return Promise.resolve({ ok: true, text: async () => FIXTURE });
    });
    vi.stubGlobal("fetch", fetchMock);

    const [publicEvents, internalEvents] = await Promise.all([
      fetchPublicEvents({ now: REFERENCE_NOW }),
      fetchInternalEvents({ now: REFERENCE_NOW }),
    ]);

    expect(publicEvents).toHaveLength(2);
    expect(internalEvents).toEqual([]);
  });
});
