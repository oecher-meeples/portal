import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeple: requireMeepleMock };
});

const { confirmOwnShiftBooking, declineOwnShiftBooking } =
  await import("./actions");

class RedirectError extends Error {}

const ME = { id: "meeple-1", neonAuthUserId: "auth-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(ME);
});

describe("without a session", () => {
  it("performs no write", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(confirmOwnShiftBooking("shift-1")).rejects.toThrow(
      RedirectError,
    );
    await expect(declineOwnShiftBooking("shift-1")).rejects.toThrow(
      RedirectError,
    );

    expect(prismaMock.shiftBooking.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.shiftBooking.deleteMany).not.toHaveBeenCalled();
  });
});

describe("confirmOwnShiftBooking", () => {
  it("confirms only the caller's own unconfirmed assignment", async () => {
    prismaMock.shiftBooking.updateMany.mockResolvedValue({ count: 1 } as never);

    const result = await confirmOwnShiftBooking("shift-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.shiftBooking.updateMany).toHaveBeenCalledWith({
      where: { shiftId: "shift-1", meepleId: "meeple-1", confirmedAt: null },
      data: { confirmedAt: expect.any(Date) },
    });
  });

  it("reports an error when there is no own unconfirmed assignment", async () => {
    prismaMock.shiftBooking.updateMany.mockResolvedValue({ count: 0 } as never);

    const result = await confirmOwnShiftBooking("shift-1");

    expect(result).toEqual({
      error: "Keine offene Zuweisung für diese Schicht gefunden.",
    });
  });
});

describe("declineOwnShiftBooking", () => {
  it("removes only the caller's own assignment", async () => {
    prismaMock.shiftBooking.deleteMany.mockResolvedValue({ count: 1 } as never);

    await declineOwnShiftBooking("shift-1");

    expect(prismaMock.shiftBooking.deleteMany).toHaveBeenCalledWith({
      where: { shiftId: "shift-1", meepleId: "meeple-1" },
    });
  });
});
