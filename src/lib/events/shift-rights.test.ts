import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const {
  hasRoleGrantedPermission,
  findActiveShiftEvent,
  hasActiveAusleiheShift,
} = await import("./shift-rights");

const MEEPLE_ID = "meeple-1";
const PERMISSION_KEY = "events:manage";
const AT = new Date("2026-07-29T14:00:00Z");

beforeEach(() => {
  prismaMock.meeple.findUnique.mockResolvedValue({
    neonAuthUserId: null,
  } as never);
  prismaMock.shiftBooking.findFirst.mockResolvedValue(null);
});

describe("hasRoleGrantedPermission", () => {
  it("is true for a meeple holding the permission durably, regardless of bookings", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      neonAuthUserId: "user-1",
    } as never);
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await hasRoleGrantedPermission(
      MEEPLE_ID,
      PERMISSION_KEY,
      AT,
    );

    expect(result).toBe(true);
    expect(prismaMock.shiftBooking.findFirst).not.toHaveBeenCalled();
  });

  it("is true for a booked shift whose role grants the permission, `at` inside the time window", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue({
      shiftId: "shift-1",
      meepleId: MEEPLE_ID,
    } as never);

    const result = await hasRoleGrantedPermission(
      MEEPLE_ID,
      PERMISSION_KEY,
      AT,
    );

    expect(result).toBe(true);
    expect(prismaMock.shiftBooking.findFirst).toHaveBeenCalledWith({
      where: {
        meepleId: MEEPLE_ID,
        shift: { role: { grantsPermissionKey: PERMISSION_KEY } },
        startsAt: { lte: AT },
        endsAt: { gte: AT },
      },
    });
  });

  it("is false for a booked shift with `at` outside the time window", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue(null);

    const result = await hasRoleGrantedPermission(
      MEEPLE_ID,
      PERMISSION_KEY,
      AT,
    );

    expect(result).toBe(false);
  });

  it("is false for a booked shift whose role does not grant the permission", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue(null);

    const result = await hasRoleGrantedPermission(
      MEEPLE_ID,
      PERMISSION_KEY,
      AT,
    );

    expect(result).toBe(false);
    expect(prismaMock.shiftBooking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shift: expect.objectContaining({
            role: { grantsPermissionKey: PERMISSION_KEY },
          }),
        }),
      }),
    );
  });

  it("is false with no booking and no permission", async () => {
    const result = await hasRoleGrantedPermission(
      MEEPLE_ID,
      PERMISSION_KEY,
      AT,
    );

    expect(result).toBe(false);
  });
});

describe("findActiveShiftEvent", () => {
  it("returns the eventId for an active booking matching the role name", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue({
      shift: { eventId: "event-1" },
    } as never);

    const result = await findActiveShiftEvent(MEEPLE_ID, "Leihe", AT);

    expect(result).toEqual({ eventId: "event-1" });
    expect(prismaMock.shiftBooking.findFirst).toHaveBeenCalledWith({
      where: {
        meepleId: MEEPLE_ID,
        shift: { role: { name: "Leihe" } },
        startsAt: { lte: AT },
        endsAt: { gte: AT },
      },
      select: { shift: { select: { eventId: true } } },
    });
  });

  it("returns null with no active booking", async () => {
    prismaMock.shiftBooking.findFirst.mockResolvedValue(null);

    const result = await findActiveShiftEvent(MEEPLE_ID, "Leihe", AT);

    expect(result).toBeNull();
  });
});

describe("hasActiveAusleiheShift (#433)", () => {
  it("is false without a Neon Auth user id (guest)", async () => {
    const result = await hasActiveAusleiheShift(null);

    expect(result).toBe(false);
    expect(prismaMock.meeple.findUnique).not.toHaveBeenCalled();
  });

  it("is false when no Meeple exists for the Neon Auth user", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(null);

    const result = await hasActiveAusleiheShift("neon-user-1");

    expect(result).toBe(false);
    expect(prismaMock.shiftBooking.findFirst).not.toHaveBeenCalled();
  });

  it("is true for a Meeple with a currently active 'Leihe'-Schichtbuchung", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      id: MEEPLE_ID,
    } as never);
    prismaMock.shiftBooking.findFirst.mockResolvedValue({
      shift: { eventId: "event-1" },
    } as never);

    const result = await hasActiveAusleiheShift("neon-user-1");

    expect(result).toBe(true);
    expect(prismaMock.shiftBooking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          meepleId: MEEPLE_ID,
          shift: { role: { name: "Leihe" } },
        }),
      }),
    );
  });

  it("is false for a Meeple without a currently active 'Leihe'-Schichtbuchung", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      id: MEEPLE_ID,
    } as never);
    prismaMock.shiftBooking.findFirst.mockResolvedValue(null);

    const result = await hasActiveAusleiheShift("neon-user-1");

    expect(result).toBe(false);
  });
});
