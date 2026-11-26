import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { findEventPlanningStatuses, summarizeEventPlanning } =
  await import("./planning-status");

const at = (hour: number) => new Date(2026, 9, 10, hour, 0);

describe("summarizeEventPlanning", () => {
  it("reports no percentage and no bookings for an event without shifts", () => {
    const status = summarizeEventPlanning({
      id: "e1",
      title: "Spieletag",
      visibility: "DRAFT",
      helperPhase: "PLANNING",
      shifts: [],
    });

    expect(status).toMatchObject({
      shiftCount: 0,
      coveragePercent: null,
      bookingCount: 0,
      confirmedCount: 0,
    });
  });

  it("counts shifts, coverage and confirmed bookings", () => {
    const status = summarizeEventPlanning({
      id: "e1",
      title: "Spieletag",
      visibility: "INTERNAL",
      helperPhase: "CONFIRMATION_REQUESTED",
      shifts: [
        {
          capacity: 1,
          targetStartsAt: at(9),
          targetEndsAt: at(13),
          bookings: [
            { startsAt: at(9), endsAt: at(12), confirmedAt: new Date() },
          ],
        },
        {
          capacity: 1,
          targetStartsAt: at(14),
          targetEndsAt: at(18),
          bookings: [{ startsAt: at(14), endsAt: at(18), confirmedAt: null }],
        },
      ],
    });

    expect(status).toMatchObject({
      shiftCount: 2,
      coveragePercent: 88,
      bookingCount: 2,
      confirmedCount: 1,
    });
  });
});

describe("findEventPlanningStatuses", () => {
  it("queries not-yet-ended events starting within two months, soonest first", async () => {
    prismaMock.event.findMany.mockResolvedValue([]);
    const now = new Date("2026-10-01T10:00:00Z");

    await findEventPlanningStatuses(now);

    const args = prismaMock.event.findMany.mock.calls[0][0]!;
    const where = args.where as {
      startsAt: { lte: Date };
      OR: unknown[];
    };
    expect(where.startsAt.lte.getMonth()).toBe(11);
    expect(where.OR).toEqual([
      { endsAt: { gte: now } },
      { endsAt: null, startsAt: { gte: now } },
    ]);
    expect(args.orderBy).toEqual({ startsAt: "asc" });
  });
});
