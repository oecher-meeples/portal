import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom((...args) =>
    requirePermissionMock(...args),
  ),
);

const confirmMock = vi.fn();
const reportMock = vi.fn();
vi.mock("@/lib/ludothek/game-copy-checks", () => ({
  confirmGameCopyCheck: (...args: unknown[]) => confirmMock(...args),
  reportGameCopyDefect: (...args: unknown[]) => reportMock(...args),
}));

const requirePermissionMock = vi.fn();

const { confirmGameCondition, reportGameDefect } =
  await import("./inventory-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({ id: "warden-meeple" });
  confirmMock.mockResolvedValue({ success: true });
  reportMock.mockResolvedValue({ success: true });
});

describe("confirmGameCondition", () => {
  it("records the check as the acting Meeple (#599)", async () => {
    const result = await confirmGameCondition("game-1", "Neuwertig");

    expect(result).toEqual({ success: true });
    expect(requirePermissionMock).toHaveBeenCalledWith("games:manage");
    expect(confirmMock).toHaveBeenCalledWith(
      "game-1",
      "warden-meeple",
      "Neuwertig",
    );
  });

  it("rejects without games:manage (#563)", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(confirmGameCondition("game-1", "ok")).rejects.toThrow(
      ForbiddenError,
    );
    expect(confirmMock).not.toHaveBeenCalled();
  });
});

describe("reportGameDefect", () => {
  it("records the defect as the acting Meeple (#599)", async () => {
    const result = await reportGameDefect("game-1", "beschaedigt", "Riss");

    expect(result).toEqual({ success: true });
    expect(reportMock).toHaveBeenCalledWith(
      "game-1",
      "warden-meeple",
      "beschaedigt",
      "Riss",
    );
  });

  it("rejects without games:manage (#563)", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(
      reportGameDefect("game-1", "beschaedigt", "Mangel"),
    ).rejects.toThrow(ForbiddenError);
    expect(reportMock).not.toHaveBeenCalled();
  });
});
