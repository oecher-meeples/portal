import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const assignShiftBookingMock = vi.fn();
const unassignShiftBookingMock = vi.fn();
vi.mock("@/lib/events/shift-booking-assignment", () => ({
  assignShiftBooking: (...args: unknown[]) => assignShiftBookingMock(...args),
  unassignShiftBooking: (...args: unknown[]) =>
    unassignShiftBookingMock(...args),
}));

const { assignHelperToShift, unassignHelperFromShift } =
  await import("./shift-plan-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
  prismaMock.shift.findUnique.mockResolvedValue({
    eventId: "event-1",
  } as never);
});

describe("without the events:manage permission", () => {
  it("changes nothing", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(
      assignHelperToShift("shift-1", "meeple-1", new Date(), new Date()),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      unassignHelperFromShift("shift-1", "meeple-1"),
    ).rejects.toThrow(ForbiddenError);

    expect(assignShiftBookingMock).not.toHaveBeenCalled();
    expect(unassignShiftBookingMock).not.toHaveBeenCalled();
  });
});

describe("assignHelperToShift", () => {
  it("delegates to assignShiftBooking and returns its result", async () => {
    const startsAt = new Date("2026-10-10T10:00:00Z");
    const endsAt = new Date("2026-10-10T14:00:00Z");
    assignShiftBookingMock.mockResolvedValue({ success: true });

    const result = await assignHelperToShift(
      "shift-1",
      "meeple-1",
      startsAt,
      endsAt,
    );

    expect(result).toEqual({ success: true });
    expect(assignShiftBookingMock).toHaveBeenCalledWith({
      shiftId: "shift-1",
      meepleId: "meeple-1",
      startsAt,
      endsAt,
    });
  });

  it("surfaces a validation error without revalidating", async () => {
    assignShiftBookingMock.mockResolvedValue({ error: "nope" });

    const result = await assignHelperToShift(
      "shift-1",
      "meeple-1",
      new Date(),
      new Date(),
    );

    expect(result).toEqual({ error: "nope" });
  });
});

describe("unassignHelperFromShift", () => {
  it("delegates to unassignShiftBooking", async () => {
    unassignShiftBookingMock.mockResolvedValue({ success: true });

    const result = await unassignHelperFromShift("shift-1", "meeple-1");

    expect(result).toEqual({ success: true });
    expect(unassignShiftBookingMock).toHaveBeenCalledWith(
      "shift-1",
      "meeple-1",
    );
  });
});
