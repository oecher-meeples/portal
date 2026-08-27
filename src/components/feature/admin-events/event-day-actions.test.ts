import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const { updateEventDayTimes } = await import("./event-day-actions");

class ForbiddenError extends Error {}

const VALID_INPUT = {
  startsAt: new Date("2026-10-10T10:00:00Z"),
  endsAt: new Date("2026-10-10T18:00:00Z"),
};

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
});

describe("without the events:manage permission", () => {
  it("changes nothing in the database", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(updateEventDayTimes("day-1", VALID_INPUT)).rejects.toThrow(
      ForbiddenError,
    );

    expect(prismaMock.eventDay.update).not.toHaveBeenCalled();
  });
});

describe("updateEventDayTimes", () => {
  it("rejects an end at or before the start", async () => {
    const result = await updateEventDayTimes("day-1", {
      ...VALID_INPUT,
      endsAt: VALID_INPUT.startsAt,
    });

    expect(result).toEqual({
      error: "Das Ende muss nach dem Beginn liegen.",
    });
    expect(prismaMock.eventDay.update).not.toHaveBeenCalled();
  });

  it("allows clearing both times back to null", async () => {
    prismaMock.eventDay.update.mockResolvedValue({
      id: "day-1",
      eventId: "event-1",
    } as never);

    const result = await updateEventDayTimes("day-1", {
      startsAt: null,
      endsAt: null,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.eventDay.update).toHaveBeenCalledWith({
      where: { id: "day-1" },
      data: { startsAt: null, endsAt: null },
    });
  });

  it("updates the day's opening time with valid input", async () => {
    prismaMock.eventDay.update.mockResolvedValue({
      id: "day-1",
      eventId: "event-1",
    } as never);

    const result = await updateEventDayTimes("day-1", VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(prismaMock.eventDay.update).toHaveBeenCalledWith({
      where: { id: "day-1" },
      data: { startsAt: VALID_INPUT.startsAt, endsAt: VALID_INPUT.endsAt },
    });
  });
});
