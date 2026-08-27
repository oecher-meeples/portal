import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const { hasRoleGrantedPermission } = await import("./shift-rights");

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
        shift: {
          role: { grantsPermissionKey: PERMISSION_KEY },
          startsAt: { lte: AT },
          endsAt: { gte: AT },
        },
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
