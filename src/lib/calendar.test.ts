import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCalendarEvents } from "@/lib/calendar";

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
