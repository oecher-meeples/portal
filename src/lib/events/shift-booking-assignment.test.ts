import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

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
  prismaMock.helperAvailability.findUnique.mockResolvedValue(
    availability() as never,
  );
  prismaMock.shiftBooking.findFirst.mockResolvedValue(null);
});

describe("assignShiftBooking", () => {
  it("rejects an end before or equal to the start", async () => {
    const result = await assignShiftBooking({
      shiftId: "shift-1",
      meepleId: "meeple-1",
      startsAt: END,
      endsAt: START,
    });

    expect(result).toEqual({ error: "Das Ende muss nach dem Beginn liegen." });
    expect(prismaMock.shiftBooking.upsert).not.toHaveBeenCalled();
  });

  it("rejects when the shift doesn't exist", async () => {
    prismaMock.shift.findUnique.mockResolvedValue(null);

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      meepleId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({ error: "Schicht nicht gefunden." });
  });

  it("rejects when the meeple has no availability for that day", async () => {
    prismaMock.helperAvailability.findUnique.mockResolvedValue(null);

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      meepleId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({
      error:
        "Dieses Meeple hat sich für diese Rolle an diesem Tag nicht als verfügbar gemeldet.",
    });
  });

  it("rejects when the availability doesn't include this role", async () => {
    prismaMock.helperAvailability.findUnique.mockResolvedValue(
      availability({ roles: [{ roleId: "role-abbau" }] }) as never,
    );

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      meepleId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({
      error:
        "Dieses Meeple hat sich für diese Rolle an diesem Tag nicht als verfügbar gemeldet.",
    });
  });

  it("rejects a block outside the reported availability window", async () => {
    prismaMock.helperAvailability.findUnique.mockResolvedValue(
      availability({
        startsAt: new Date("2026-10-10T11:00:00Z"),
      }) as never,
    );

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      meepleId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({
      error: "Der Zeitblock liegt außerhalb der gemeldeten Verfügbarkeit.",
    });
  });

  it("rejects a block overlapping another assignment of the same person", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue({
      shiftId: "shift-2",
      meepleId: "meeple-1",
    } as never);

    const result = await assignShiftBooking({
      shiftId: "shift-1",
      meepleId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({
      error:
        "Überschneidet sich zeitlich mit einer anderen Zuweisung dieser Person.",
    });
    expect(prismaMock.shiftBooking.upsert).not.toHaveBeenCalled();
  });

  it("excludes the shift's own existing booking from the overlap check", async () => {
    await assignShiftBooking({
      shiftId: "shift-1",
      meepleId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(prismaMock.shiftBooking.findFirst).toHaveBeenCalledWith({
      where: {
        meepleId: "meeple-1",
        shiftId: { not: "shift-1" },
        startsAt: { lt: END },
        endsAt: { gt: START },
      },
    });
  });

  it("upserts the booking on success", async () => {
    const result = await assignShiftBooking({
      shiftId: "shift-1",
      meepleId: "meeple-1",
      startsAt: START,
      endsAt: END,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.shiftBooking.upsert).toHaveBeenCalledWith({
      where: { shiftId_meepleId: { shiftId: "shift-1", meepleId: "meeple-1" } },
      create: {
        shiftId: "shift-1",
        meepleId: "meeple-1",
        startsAt: START,
        endsAt: END,
      },
      update: { startsAt: START, endsAt: END },
    });
  });
});

describe("unassignShiftBooking", () => {
  it("deletes the meeple's booking on that shift", async () => {
    prismaMock.shiftBooking.deleteMany.mockResolvedValue({
      count: 1,
    } as never);

    const result = await unassignShiftBooking("shift-1", "meeple-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.shiftBooking.deleteMany).toHaveBeenCalledWith({
      where: { shiftId: "shift-1", meepleId: "meeple-1" },
    });
  });
});
