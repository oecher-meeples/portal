import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchInternalEvents,
  fetchPublicEvents,
  parseCalendarEvents,
} from "@/lib/calendar";

const FIXTURE = fs.readFileSync(
  path.join(__dirname, "__fixtures__", "calendar.ics"),
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

function mockFetchOnce(ok: boolean, text: string) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, text: async () => text });
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
