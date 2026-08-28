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

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "termin",
      title: "Offener Spieleabend",
      date: "2026-08-10",
      location: "Vereinsheim Aachen",
    });
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
  });

  it("sorts entries descending by date, newest first (#252)", async () => {
    vi.mocked(getAllContent).mockResolvedValue([
      { slug: "alt", type: "blog", title: "Alt", date: "2026-06-01" },
      { slug: "neu", type: "blog", title: "Neu", date: "2026-08-01" },
    ] as Awaited<ReturnType<typeof getAllContent>>);

    const items = await getAllContentWithCalendar();

    expect(items.map((item) => item.date)).toEqual([
      "2026-08-01",
      "2026-06-01",
    ]);
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

describe("fetchInternalEvents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ICS_FEED_URL_INTERNAL;
  });

  it("parses the internal feed and marks every event internal", async () => {
    process.env.ICS_FEED_URL_INTERNAL = "https://example.org/internal.ics";
    mockFetchOnce(true, FIXTURE);

    const events = await fetchInternalEvents({ now: REFERENCE_NOW });

    expect(events).toHaveLength(1);
    expect(events[0].internal).toBe(true);
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

    expect(publicEvents).toHaveLength(1);
    expect(internalEvents).toEqual([]);
  });
});
