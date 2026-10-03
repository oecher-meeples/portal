import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardGameTrait, BoardGameTraitTone } from "@prisma/client";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const updateBoardGameTraitTextRecordMock = vi.fn();
vi.mock("@/lib/ludothek/board-game-trait-texts", () => ({
  updateBoardGameTraitText: (...args: unknown[]) =>
    updateBoardGameTraitTextRecordMock(...args),
}));

const { updateBoardGameTraitText } =
  await import("./board-game-trait-texts-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-1" });
  updateBoardGameTraitTextRecordMock
    .mockReset()
    .mockResolvedValue({ success: true });
});

const UPDATE_INPUT = {
  label: "Legacy",
  tooltip: "",
  tone: BoardGameTraitTone.WARNING,
  loanMessage: "Achtung Legacy.",
  detailsMessage: "",
};

for (const [name, fn, args] of [
  [
    "updateBoardGameTraitText",
    updateBoardGameTraitText,
    [BoardGameTrait.LEGACY, UPDATE_INPUT],
  ],
] as const) {
  it(`${name} requires games:manage`, async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(
      (fn as (...a: unknown[]) => Promise<unknown>)(...args),
    ).rejects.toThrow(ForbiddenError);
  });
}

describe("updateBoardGameTraitText", () => {
  it("trims blank optional text fields down to null", async () => {
    await updateBoardGameTraitText(BoardGameTrait.LEGACY, {
      ...UPDATE_INPUT,
      tooltip: "   ",
      detailsMessage: "  ",
    });

    expect(updateBoardGameTraitTextRecordMock).toHaveBeenCalledWith(
      BoardGameTrait.LEGACY,
      {
        label: "Legacy",
        tooltip: null,
        tone: BoardGameTraitTone.WARNING,
        loanMessage: "Achtung Legacy.",
        detailsMessage: null,
      },
    );
  });
});
