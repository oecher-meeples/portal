import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeple: requireMeepleMock };
});

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const { clearGameDefect, confirmGameCondition, reportGameDefect } =
  await import("./inventory-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requireMeepleMock.mockResolvedValue({ id: "meeple-1" });
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
});

describe("confirmGameCondition", () => {
  it("sets lastCheckedAt and clears the completeness-check flag", async () => {
    const result = await confirmGameCondition("game-1", "Neuwertig");

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: {
        condition: "Neuwertig",
        lastCheckedAt: expect.any(Date),
        needsCompletenessCheck: false,
      },
    });
  });

  it("is available to any logged-in member", async () => {
    await confirmGameCondition("game-1", "ok");

    expect(requireMeepleMock).toHaveBeenCalled();
    expect(requirePermissionMock).not.toHaveBeenCalled();
  });
});

describe("reportGameDefect", () => {
  it("sets MAINTENANCE and rejects an empty note", async () => {
    const result = await reportGameDefect("game-1", "   ");

    expect(result).toEqual({ error: "Bitte eine Notiz zum Mangel angeben." });
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });

  it("records the defect note and sets the status to MAINTENANCE", async () => {
    const result = await reportGameDefect("game-1", "Karte fehlt");

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: {
        condition: "Karte fehlt",
        lastCheckedAt: expect.any(Date),
        status: "MAINTENANCE",
      },
    });
  });

  it("is available to any logged-in member", async () => {
    await reportGameDefect("game-1", "Mangel");

    expect(requireMeepleMock).toHaveBeenCalled();
    expect(requirePermissionMock).not.toHaveBeenCalled();
  });
});

describe("clearGameDefect", () => {
  it("rejects without games:manage", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(clearGameDefect("game-1")).rejects.toThrow(ForbiddenError);
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });

  it("resets the status to ACTIVE", async () => {
    const result = await clearGameDefect("game-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { status: "ACTIVE" },
    });
  });
});
