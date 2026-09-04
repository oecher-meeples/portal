import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  findUpcomingEvents,
  findUpcomingEventsVisibleToMembers,
  findUpcomingBringAndBuyEvents,
  findOpenHelperRequestEvent,
  hasOpenHelperRequest,
  isBringAndBuyMarketOpen,
  isEventCurrentlyRunning,
  isEventRunningAt,
  resolveSelectedEventId,
} = await import("./upcoming");

describe("isEventRunningAt", () => {
  const NOW = new Date("2026-08-03T12:00:00Z");

  it("is true when the event has started and has no end date", () => {
    expect(
      isEventRunningAt(
        { startsAt: new Date("2026-08-01T00:00:00Z"), endsAt: null },
        NOW,
      ),
    ).toBe(true);
  });

  it("is false before the event has started", () => {
    expect(
      isEventRunningAt(
        { startsAt: new Date("2026-08-04T00:00:00Z"), endsAt: null },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false once the event has ended", () => {
    expect(
      isEventRunningAt(
        {
          startsAt: new Date("2026-08-01T00:00:00Z"),
          endsAt: new Date("2026-08-02T00:00:00Z"),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("is true while within a multi-day event's start/end range", () => {
    expect(
      isEventRunningAt(
        {
          startsAt: new Date("2026-08-01T00:00:00Z"),
          endsAt: new Date("2026-08-10T00:00:00Z"),
        },
        NOW,
      ),
    ).toBe(true);
  });
});

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
    prismaMock.event.findFirst.mockResolvedValue({
      startsAt: new Date("2026-08-01T00:00:00Z"),
      endsAt: null,
    } as never);

    expect(await isEventCurrentlyRunning("event-1")).toBe(true);
  });

  it("is false for an event that hasn't started yet or has already ended", async () => {
    prismaMock.event.findFirst.mockResolvedValue({
      startsAt: new Date("2026-08-10T00:00:00Z"),
      endsAt: null,
    } as never);

    expect(await isEventCurrentlyRunning("event-future-or-past")).toBe(false);
  });

  it("is false for an id that doesn't exist", async () => {
    prismaMock.event.findFirst.mockResolvedValue(null);

    expect(await isEventCurrentlyRunning("missing")).toBe(false);
  });

  it("queries by id only, applying the time window in JS via isEventRunningAt", async () => {
    prismaMock.event.findFirst.mockResolvedValue(null);

    await isEventCurrentlyRunning("event-1");

    expect(prismaMock.event.findFirst).toHaveBeenCalledWith({
      where: { id: "event-1" },
      select: { startsAt: true, endsAt: true },
    });
  });
});

describe("hasOpenHelperRequest", () => {
  it("is true when an upcoming event has helpersWanted set", async () => {
    prismaMock.event.findFirst.mockResolvedValue({
      id: "event-1",
      title: "Spieletag",
    } as never);

    expect(await hasOpenHelperRequest()).toBe(true);
    expect(prismaMock.event.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ helpersWanted: true }),
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true },
    });
  });

  it("is false when no upcoming event has an open helper request", async () => {
    prismaMock.event.findFirst.mockResolvedValue(null);

    expect(await hasOpenHelperRequest()).toBe(false);
  });
});

describe("findOpenHelperRequestEvent", () => {
  it("returns the earliest upcoming event with an open helper request", async () => {
    prismaMock.event.findFirst.mockResolvedValue({
      id: "event-1",
      title: "Spieletag",
    } as never);

    const result = await findOpenHelperRequestEvent();

    expect(result).toEqual({ id: "event-1", title: "Spieletag" });
  });

  it("returns null when nothing matches", async () => {
    prismaMock.event.findFirst.mockResolvedValue(null);

    expect(await findOpenHelperRequestEvent()).toBeNull();
  });

  it("does not filter by visibility — an Entwurf-Event with helpersWanted still counts", async () => {
    await findOpenHelperRequestEvent();

    expect(prismaMock.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ visibility: expect.anything() }),
      }),
    );
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

describe("findUpcomingEventsVisibleToMembers", () => {
  it("includes non-Entwurf events, or Entwurf events with helpersWanted", async () => {
    prismaMock.event.findMany.mockResolvedValue([]);

    await findUpcomingEventsVisibleToMembers();

    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: [{ visibility: { not: "DRAFT" } }, { helpersWanted: true }],
            },
          ]),
        }),
      }),
    );
  });
});

describe("isBringAndBuyMarketOpen", () => {
  const NOW = new Date("2026-08-25T12:00:00Z");

  it("is false when the event has no Bring&Buy market", () => {
    expect(
      isBringAndBuyMarketOpen(
        {
          hasBringAndBuyMarket: false,
          startsAt: new Date("2026-08-26T10:00:00Z"),
          endsAt: null,
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("is true when the event starts within the next 30 days", () => {
    expect(
      isBringAndBuyMarketOpen(
        {
          hasBringAndBuyMarket: true,
          startsAt: new Date("2026-09-20T10:00:00Z"),
          endsAt: null,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it("is false when the event starts more than 30 days from now", () => {
    expect(
      isBringAndBuyMarketOpen(
        {
          hasBringAndBuyMarket: true,
          startsAt: new Date("2026-09-26T10:00:00Z"),
          endsAt: null,
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("is true right at the 30-day boundary", () => {
    expect(
      isBringAndBuyMarketOpen(
        {
          hasBringAndBuyMarket: true,
          startsAt: new Date("2026-09-24T12:00:00Z"),
          endsAt: null,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it("is false when the event has already ended", () => {
    expect(
      isBringAndBuyMarketOpen(
        {
          hasBringAndBuyMarket: true,
          startsAt: new Date("2026-08-20T10:00:00Z"),
          endsAt: new Date("2026-08-20T18:00:00Z"),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("is true for an ongoing multi-day event that hasn't ended", () => {
    expect(
      isBringAndBuyMarketOpen(
        {
          hasBringAndBuyMarket: true,
          startsAt: new Date("2026-08-20T10:00:00Z"),
          endsAt: new Date("2026-08-27T18:00:00Z"),
        },
        NOW,
      ),
    ).toBe(true);
  });
});

describe("findUpcomingBringAndBuyEvents", () => {
  it("queries only events with the flag, within the 30-day window, not ended", async () => {
    const NOW = new Date("2026-08-25T12:00:00Z");
    prismaMock.event.findMany.mockResolvedValue([]);

    await findUpcomingBringAndBuyEvents(undefined, NOW);

    expect(prismaMock.event.findMany).toHaveBeenCalledWith({
      where: {
        hasBringAndBuyMarket: true,
        startsAt: { lte: new Date("2026-09-24T12:00:00Z") },
        OR: [{ endsAt: null }, { endsAt: { gte: NOW } }],
      },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true },
    });
  });

  it("forwards a custom select shape instead of the default", async () => {
    prismaMock.event.findMany.mockResolvedValue([]);

    await findUpcomingBringAndBuyEvents({ id: true, slug: true });

    expect(prismaMock.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, slug: true } }),
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
