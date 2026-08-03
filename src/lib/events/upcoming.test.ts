import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { isEventCurrentlyRunning } = await import("./upcoming");

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
