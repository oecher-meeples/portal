import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { findUpcomingEvents, isEventCurrentlyRunning, resolveSelectedEventId } =
  await import("./upcoming");

describe("isEventCurrentlyRunning", () => {
  const NOW = new Date("2026-08-03T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is true when the event has started and has no end date", async () => {
    prismaMock.event.findFirst.mockResolvedValue({ id: "event-1" } as never);

    expect(await isEventCurrentlyRunning("event-1")).toBe(true);
  });

  it("is false for an event that hasn't started yet or has already ended", async () => {
    prismaMock.event.findFirst.mockResolvedValue(null);

    expect(await isEventCurrentlyRunning("event-future-or-past")).toBe(false);
  });

  it("queries with a lower bound on startsAt and an open or future endsAt", async () => {
    prismaMock.event.findFirst.mockResolvedValue(null);

    await isEventCurrentlyRunning("event-1");

    expect(prismaMock.event.findFirst).toHaveBeenCalledWith({
      where: {
        id: "event-1",
        startsAt: { lte: NOW },
        OR: [{ endsAt: null }, { endsAt: { gte: NOW } }],
      },
      select: { id: true },
    });
  });
});

describe("findUpcomingEvents", () => {
  it("returns no events when nothing upcoming is found", async () => {
    prismaMock.event.findMany.mockResolvedValue([]);

    expect(await findUpcomingEvents()).toEqual([]);
  });

  it("returns whichever events the query resolves, in that order", async () => {
    const ordered = [
      { id: "event-soon", title: "Spieleabend" },
      { id: "event-later", title: "Turnier" },
    ];
    prismaMock.event.findMany.mockResolvedValue(ordered as never);

    expect(await findUpcomingEvents()).toEqual(ordered);
  });

  it("sorts ascending by start time, earliest event first", async () => {
    await findUpcomingEvents();

    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { startsAt: "asc" } }),
    );
  });

  it("defaults to selecting just id and title when no select is given", async () => {
    prismaMock.event.findMany.mockResolvedValue([]);

    await findUpcomingEvents();

    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, title: true } }),
    );
  });

  it("forwards a custom select shape instead of the default", async () => {
    prismaMock.event.findMany.mockResolvedValue([]);

    await findUpcomingEvents({ id: true, slug: true, startsAt: true });

    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, slug: true, startsAt: true },
      }),
    );
  });
});

describe("resolveSelectedEventId", () => {
  it("returns null when there is no event at all", () => {
    expect(resolveSelectedEventId([], undefined)).toBeNull();
    expect(resolveSelectedEventId([], "any-id")).toBeNull();
  });

  it("falls back to the first (soonest) event when nothing was requested", () => {
    const events = [{ id: "event-soon" }, { id: "event-later" }];

    expect(resolveSelectedEventId(events, undefined)).toBe("event-soon");
  });

  it("picks the requested event when it exists among the upcoming ones", () => {
    const events = [{ id: "event-soon" }, { id: "event-later" }];

    expect(resolveSelectedEventId(events, "event-later")).toBe("event-later");
  });

  it("falls back to the first event when the requested id is not among the upcoming ones", () => {
    // E.g. a bookmarked link to an event that has since ended.
    const events = [{ id: "event-soon" }, { id: "event-later" }];

    expect(resolveSelectedEventId(events, "event-long-past")).toBe(
      "event-soon",
    );
  });

  it("treats an empty string request the same as no request", () => {
    const events = [{ id: "event-soon" }];

    expect(resolveSelectedEventId(events, "")).toBe("event-soon");
  });
});
