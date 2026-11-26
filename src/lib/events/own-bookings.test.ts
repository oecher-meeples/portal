import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { findOwnVisibleShiftBookings, visibleOwnBookingsWhere } =
  await import("./own-bookings");

describe("visibleOwnBookingsWhere (#676)", () => {
  it("only matches events in the CONFIRMATION_REQUESTED phase", () => {
    const where = visibleOwnBookingsWhere("meeple-1");

    expect(where.meepleId).toBe("meeple-1");
    expect(where.shift.event.helperPhase).toEqual({
      in: ["CONFIRMATION_REQUESTED"],
    });
  });

  it("excludes events that are already over", () => {
    const { OR } = visibleOwnBookingsWhere("meeple-1").shift.event;

    expect(OR[0]).toEqual({ endsAt: null });
    expect(OR[1]).toEqual({ endsAt: { gte: expect.any(Date) } });
  });
});

describe("findOwnVisibleShiftBookings", () => {
  it("queries with the phase-gated filter, ordered by start", async () => {
    prismaMock.shiftBooking.findMany.mockResolvedValue([]);

    await findOwnVisibleShiftBookings("meeple-1");

    expect(prismaMock.shiftBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          meepleId: "meeple-1",
          shift: {
            event: expect.objectContaining({
              helperPhase: { in: ["CONFIRMATION_REQUESTED"] },
            }),
          },
        }),
        orderBy: { startsAt: "asc" },
      }),
    );
  });
});
