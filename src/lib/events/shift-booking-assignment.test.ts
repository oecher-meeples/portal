import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { formatTimePlain } from "@/lib/utils/format";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { assignShiftBooking, unassignShiftBooking } =
  await import("./shift-booking-assignment");

const SHIFT = { id: "shift-1", dayId: "day-1", roleId: "role-kueche" };
const START = new Date("2026-10-10T10:00:00Z");
const END = new Date("2026-10-10T14:00:00Z");

function availability(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    meepleId: "meeple-1",
    dayId: "day-1",
    startsAt: new Date("2026-10-10T08:00:00Z"),
    endsAt: new Date("2026-10-10T18:00:00Z"),
    roles: [{ roleId: "role-kueche" }],
    ...overrides,
  };
}

beforeEach(() => {
  prismaMock.shift.findUnique.mockResolvedValue(SHIFT as never);
  prismaMock.helperAvailability.findFirst.mockResolvedValue(
    availability() as never,
  );
  prismaMock.shiftBooking.findFirst.mockResolvedValue(null);
});

describe("assignShiftBooking", () => {
  it("books a guest with guestId and an already confirmed block", async () => {
    prismaMock.helperAvailability.findFirst.mockResolvedValue(
      availability({ meepleId: null, guestId: "guest-1" }) as never,
    );

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "guest-1",
      isGuest: true,
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.helperAvailability.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { guestId: "guest-1", dayId: "day-1" },
      }),
    );
    expect(prismaMock.shiftBooking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shiftId: "shift-1",
        guestId: "guest-1",
        confirmedAt: expect.any(Date),
      }),
    });
  });

  it("rejects an end before or equal to the start", async () => {
    const result = await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: END,
      endsAt: START,
    });

    expect(result).toEqual({ error: "Das Ende muss nach dem Beginn liegen." });
    expect(prismaMock.shiftBooking.create).not.toHaveBeenCalled();
  });

  it("rejects when the shift doesn't exist", async () => {
    prismaMock.shift.findUnique.mockResolvedValue(null);

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({ error: "Schicht nicht gefunden." });
  });

  it("rejects when the meeple has no availability for that day", async () => {
    prismaMock.helperAvailability.findFirst.mockResolvedValue(null);

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({
      error:
        "Dieses Meeple hat sich für diese Rolle an diesem Tag nicht als verfügbar gemeldet.",
    });
  });

  it("rejects when the availability doesn't include this role", async () => {
    prismaMock.helperAvailability.findFirst.mockResolvedValue(
      availability({ roles: [{ roleId: "role-abbau" }] }) as never,
    );

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({
      error:
        "Dieses Meeple hat sich für diese Rolle an diesem Tag nicht als verfügbar gemeldet.",
    });
  });

  it("rejects a block outside the reported availability window, naming the actual bounds", async () => {
    const availabilityStartsAt = new Date("2026-10-10T11:00:00Z");
    const availabilityEndsAt = new Date("2026-10-10T18:00:00Z");
    prismaMock.helperAvailability.findFirst.mockResolvedValue(
      availability({ startsAt: availabilityStartsAt }) as never,
    );

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({
      error: `Der Zeitblock liegt außerhalb der gemeldeten Verfügbarkeit (${formatTimePlain(availabilityStartsAt)}–${formatTimePlain(availabilityEndsAt)}).`,
    });
  });

  it("rejects a block overlapping another assignment of the same person", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue({
      shiftId: "shift-2",
      meepleId: "meeple-1",
    } as never);

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({
      error:
        "Überschneidet sich zeitlich mit einer anderen Zuweisung dieser Person.",
    });
    expect(prismaMock.shiftBooking.create).not.toHaveBeenCalled();
  });

  it("checks for overlaps across all of the person's bookings, any shift", async () => {
    await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(prismaMock.shiftBooking.findFirst).toHaveBeenCalledWith({
      where: {
        meepleId: "meeple-1",
        startsAt: { lt: END },
        endsAt: { gt: START },
      },
    });
  });

  it("excludes the booking's own row from the overlap check when resizing", async () => {
    await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: START,
      endsAt: END,
      bookingId: "booking-1",
    });

    expect(prismaMock.shiftBooking.findFirst).toHaveBeenCalledWith({
      where: {
        meepleId: "meeple-1",
        id: { not: "booking-1" },
        startsAt: { lt: END },
        endsAt: { gt: START },
      },
    });
  });

  it("creates a new booking when no bookingId is given", async () => {
    const result = await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.shiftBooking.create).toHaveBeenCalledWith({
      data: {
        shiftId: "shift-1",
        meepleId: "meeple-1",
        startsAt: START,
        endsAt: END,
      },
    });
    expect(prismaMock.shiftBooking.update).not.toHaveBeenCalled();
  });

  it("re-times the exact booking when a bookingId is given", async () => {
    const result = await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: START,
      endsAt: END,
      bookingId: "booking-1",
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.shiftBooking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { startsAt: START, endsAt: END },
    });
    expect(prismaMock.shiftBooking.create).not.toHaveBeenCalled();
  });
});

describe("confirmedAt reset on re-timing (#683)", () => {
  const OLD_START = new Date("2026-10-10T10:00:00Z");
  const OLD_END = new Date("2026-10-10T14:00:00Z");

  function mockExisting() {
    prismaMock.shiftBooking.findUnique.mockResolvedValue({
      startsAt: OLD_START,
      endsAt: OLD_END,
    } as never);
  }

  it("resets confirmedAt when startsAt changes", async () => {
    mockExisting();

    await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: new Date("2026-10-10T11:00:00Z"),
      endsAt: OLD_END,
      bookingId: "booking-1",
    });

    expect(prismaMock.shiftBooking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: expect.objectContaining({ confirmedAt: null }),
    });
  });

  it("resets confirmedAt when endsAt changes", async () => {
    mockExisting();

    await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: OLD_START,
      endsAt: new Date("2026-10-10T15:00:00Z"),
      bookingId: "booking-1",
    });

    expect(prismaMock.shiftBooking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: expect.objectContaining({ confirmedAt: null }),
    });
  });

  it("keeps confirmedAt on a pure slotIndex change", async () => {
    mockExisting();

    await assignShiftBooking({
      shiftId: "shift-1",
      helperId: "meeple-1",
      startsAt: OLD_START,
      endsAt: OLD_END,
      bookingId: "booking-1",
      slotIndex: 2,
    });

    const call = prismaMock.shiftBooking.update.mock.calls[0][0];
    expect(call.data).toEqual({
      startsAt: OLD_START,
      endsAt: OLD_END,
      slotIndex: 2,
    });
    expect(call.data).not.toHaveProperty("confirmedAt");
  });
});

describe("unassignShiftBooking", () => {
  it("deletes the specific booking", async () => {
    prismaMock.shiftBooking.deleteMany.mockResolvedValue({
      count: 1,
    } as never);

    const result = await unassignShiftBooking("booking-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.shiftBooking.deleteMany).toHaveBeenCalledWith({
      where: { id: "booking-1" },
    });
  });
});
