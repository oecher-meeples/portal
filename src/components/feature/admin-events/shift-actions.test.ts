import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const { createShift, updateShift, deleteShift } =
  await import("./shift-actions");

class ForbiddenError extends Error {}

const VALID_INPUT = {
  roleId: "role-theke",
  dayId: "day-1",
  targetStartsAt: new Date("2026-10-10T10:00:00Z"),
  targetEndsAt: new Date("2026-10-10T14:00:00Z"),
  capacity: 2,
};

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
});

describe("without the events:manage permission", () => {
  it("changes nothing in the database", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(createShift("event-1", VALID_INPUT)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(updateShift("shift-1", VALID_INPUT)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(deleteShift("shift-1")).rejects.toThrow(ForbiddenError);

    expect(prismaMock.shift.create).not.toHaveBeenCalled();
    expect(prismaMock.shift.update).not.toHaveBeenCalled();
    expect(prismaMock.shift.delete).not.toHaveBeenCalled();
  });
});

describe("createShift", () => {
  it("rejects an end before or equal to the start", async () => {
    const result = await createShift("event-1", {
      ...VALID_INPUT,
      targetEndsAt: VALID_INPUT.targetStartsAt,
    });

    expect(result).toEqual({
      error: "Das Ende muss nach dem Beginn liegen.",
    });
    expect(prismaMock.shift.create).not.toHaveBeenCalled();
  });

  it("rejects a capacity below 1", async () => {
    const result = await createShift("event-1", {
      ...VALID_INPUT,
      capacity: 0,
    });

    expect(result).toEqual({
      error: "Die Kapazität muss mindestens 1 sein.",
    });
    expect(prismaMock.shift.create).not.toHaveBeenCalled();
  });

  it("creates a shift with valid input", async () => {
    prismaMock.shift.create.mockResolvedValue({ id: "shift-1" } as never);

    const result = await createShift("event-1", VALID_INPUT);

    expect(result).toEqual({ success: true, id: "shift-1" });
    expect(prismaMock.shift.create).toHaveBeenCalledWith({
      data: {
        eventId: "event-1",
        dayId: "day-1",
        roleId: "role-theke",
        targetStartsAt: VALID_INPUT.targetStartsAt,
        targetEndsAt: VALID_INPUT.targetEndsAt,
        capacity: 2,
      },
    });
  });
});

describe("updateShift", () => {
  it("rejects invalid input without writing", async () => {
    const result = await updateShift("shift-1", {
      ...VALID_INPUT,
      capacity: -1,
    });

    expect(result).toEqual({
      error: "Die Kapazität muss mindestens 1 sein.",
    });
    expect(prismaMock.shift.update).not.toHaveBeenCalled();
  });

  it("updates a shift with valid input", async () => {
    prismaMock.shift.update.mockResolvedValue({
      id: "shift-1",
      eventId: "event-1",
    } as never);

    const result = await updateShift("shift-1", VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(prismaMock.shift.update).toHaveBeenCalledWith({
      where: { id: "shift-1" },
      data: {
        dayId: "day-1",
        roleId: "role-theke",
        targetStartsAt: VALID_INPUT.targetStartsAt,
        targetEndsAt: VALID_INPUT.targetEndsAt,
        capacity: 2,
      },
    });
  });
});

describe("deleteShift", () => {
  it("deletes a shift together with its bookings (cascade)", async () => {
    prismaMock.shift.delete.mockResolvedValue({
      id: "shift-1",
      eventId: "event-1",
    } as never);

    const result = await deleteShift("shift-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.shift.delete).toHaveBeenCalledWith({
      where: { id: "shift-1" },
    });
  });
});
