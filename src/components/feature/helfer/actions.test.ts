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

const { bookShift, updateBookingCertainty, cancelBooking } =
  await import("./actions");

class RedirectError extends Error {}

const ME = { id: "meeple-1", neonAuthUserId: "auth-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(ME);
});

describe("without a session", () => {
  it("performs no write", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(bookShift("shift-1", false)).rejects.toThrow(RedirectError);
    await expect(cancelBooking("shift-1")).rejects.toThrow(RedirectError);
    await expect(updateBookingCertainty("shift-1", true)).rejects.toThrow(
      RedirectError,
    );

    expect(prismaMock.shiftBooking.create).not.toHaveBeenCalled();
    expect(prismaMock.shiftBooking.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.shiftBooking.updateMany).not.toHaveBeenCalled();
  });
});

describe("bookShift", () => {
  it("rejects booking an already-full shift", async () => {
    prismaMock.shift.findUnique.mockResolvedValue({
      id: "shift-1",
      capacity: 1,
      bookings: [{ uncertain: false }],
    } as never);
    prismaMock.shiftBooking.findUnique.mockResolvedValue(null);

    const result = await bookShift("shift-1", false);

    expect(result).toEqual({ error: "Diese Schicht ist bereits voll." });
    expect(prismaMock.shiftBooking.create).not.toHaveBeenCalled();
  });

  it("rejects a double-booking", async () => {
    prismaMock.shift.findUnique.mockResolvedValue({
      id: "shift-1",
      capacity: 5,
      bookings: [],
    } as never);
    prismaMock.shiftBooking.findUnique.mockResolvedValue({
      shiftId: "shift-1",
      meepleId: "meeple-1",
    } as never);

    const result = await bookShift("shift-1", false);

    expect(result).toEqual({
      error: "Du bist bereits für diese Schicht eingetragen.",
    });
    expect(prismaMock.shiftBooking.create).not.toHaveBeenCalled();
  });

  it("books an open shift", async () => {
    prismaMock.shift.findUnique.mockResolvedValue({
      id: "shift-1",
      capacity: 2,
      bookings: [],
    } as never);
    prismaMock.shiftBooking.findUnique.mockResolvedValue(null);

    const result = await bookShift("shift-1", true);

    expect(result).toEqual({ success: true });
    expect(prismaMock.shiftBooking.create).toHaveBeenCalledWith({
      data: { shiftId: "shift-1", meepleId: "meeple-1", uncertain: true },
    });
  });
});

describe("cancelBooking", () => {
  it("removes only the caller's own booking", async () => {
    prismaMock.shiftBooking.deleteMany.mockResolvedValue({ count: 1 } as never);

    await cancelBooking("shift-1");

    expect(prismaMock.shiftBooking.deleteMany).toHaveBeenCalledWith({
      where: { shiftId: "shift-1", meepleId: "meeple-1" },
    });
  });
});

describe("updateBookingCertainty", () => {
  it("never changes someone else's booking", async () => {
    prismaMock.shiftBooking.updateMany.mockResolvedValue({ count: 1 } as never);

    await updateBookingCertainty("shift-1", true);

    expect(prismaMock.shiftBooking.updateMany).toHaveBeenCalledWith({
      where: { shiftId: "shift-1", meepleId: "meeple-1" },
      data: { uncertain: true },
    });
  });

  it("reports an error when there is no own booking", async () => {
    prismaMock.shiftBooking.updateMany.mockResolvedValue({ count: 0 } as never);

    const result = await updateBookingCertainty("shift-1", true);

    expect(result).toEqual({
      error: "Keine eigene Buchung für diese Schicht gefunden.",
    });
  });
});
