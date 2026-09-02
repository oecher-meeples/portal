import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeple: requireMeepleMock };
});

const setHelperAvailabilityMock = vi.fn();
const clearHelperAvailabilityMock = vi.fn();
vi.mock("@/lib/events/helper-availability", () => ({
  setHelperAvailability: (...args: unknown[]) =>
    setHelperAvailabilityMock(...args),
  clearHelperAvailability: (...args: unknown[]) =>
    clearHelperAvailabilityMock(...args),
}));

const { setOwnHelperAvailability, clearOwnHelperAvailability } =
  await import("./availability-actions");

const MEEPLE = { id: "meeple-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(MEEPLE);
});

describe("setOwnHelperAvailability", () => {
  it("delegates to setHelperAvailability with the acting meeple's id", async () => {
    setHelperAvailabilityMock.mockResolvedValue({ success: true });
    const startsAt = new Date("2026-10-10T10:00:00Z");
    const endsAt = new Date("2026-10-10T14:00:00Z");

    const result = await setOwnHelperAvailability("day-1", startsAt, endsAt, [
      "role-1",
    ]);

    expect(result).toEqual({ success: true });
    expect(setHelperAvailabilityMock).toHaveBeenCalledWith({
      meepleId: "meeple-1",
      dayId: "day-1",
      startsAt,
      endsAt,
      roleIds: ["role-1"],
    });
  });
});

describe("clearOwnHelperAvailability", () => {
  it("delegates to clearHelperAvailability with the acting meeple's id", async () => {
    clearHelperAvailabilityMock.mockResolvedValue({ success: true });

    const result = await clearOwnHelperAvailability("day-1");

    expect(result).toEqual({ success: true });
    expect(clearHelperAvailabilityMock).toHaveBeenCalledWith(
      "meeple-1",
      "day-1",
    );
  });
});
