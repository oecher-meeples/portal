import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const { hasFleaMarketRights } = await import("./shift-rights");

const MEEPLE_ID = "meeple-1";
const EVENT_ID = "event-1";
const AT = new Date("2026-07-29T14:00:00Z");

beforeEach(() => {
  prismaMock.meeple.findUnique.mockResolvedValue({
    neonAuthUserId: null,
  } as never);
  prismaMock.shiftBooking.findFirst.mockResolvedValue(null);
});

describe("hasFleaMarketRights", () => {
  it("is true for a meeple with the events:manage permission, regardless of bookings", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      neonAuthUserId: "user-1",
    } as never);
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await hasFleaMarketRights(MEEPLE_ID, EVENT_ID, AT);

    expect(result).toBe(true);
    expect(prismaMock.shiftBooking.findFirst).not.toHaveBeenCalled();
  });

  it("is true for a booked KASSE shift with `at` inside the time window", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue({
      shiftId: "shift-1",
      meepleId: MEEPLE_ID,
    } as never);

    const result = await hasFleaMarketRights(MEEPLE_ID, EVENT_ID, AT);

    expect(result).toBe(true);
    expect(prismaMock.shiftBooking.findFirst).toHaveBeenCalledWith({
      where: {
        meepleId: MEEPLE_ID,
        shift: {
          eventId: EVENT_ID,
          type: "KASSE",
          startsAt: { lte: AT },
          endsAt: { gte: AT },
        },
      },
    });
  });

  it("is false for a booked KASSE shift with `at` outside the time window", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue(null);

    const result = await hasFleaMarketRights(MEEPLE_ID, EVENT_ID, AT);

    expect(result).toBe(false);
  });

  it("is false for a booked THEKE or LEIHE shift (not KASSE)", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue(null);

    const result = await hasFleaMarketRights(MEEPLE_ID, EVENT_ID, AT);

    expect(result).toBe(false);
    expect(prismaMock.shiftBooking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shift: expect.objectContaining({ type: "KASSE" }),
        }),
      }),
    );
  });

  it("is false with no booking and no permission", async () => {
    const result = await hasFleaMarketRights(MEEPLE_ID, EVENT_ID, AT);

    expect(result).toBe(false);
  });
});
