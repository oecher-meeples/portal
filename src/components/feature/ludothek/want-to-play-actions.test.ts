import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/members/meeples", () => ({
  requireMeeple: async () => ({ id: "meeple-1" }),
}));

const { setWantToPlayMarkAction } = await import("./want-to-play-actions");

beforeEach(() => vi.clearAllMocks());

describe("setWantToPlayMarkAction (#632-Folge)", () => {
  it("marks the title for the current meeple only", async () => {
    const result = await setWantToPlayMarkAction("game-1", true);

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameWantToPlay.upsert).toHaveBeenCalledWith({
      where: {
        meepleId_boardGameId: { meepleId: "meeple-1", boardGameId: "game-1" },
      },
      create: { meepleId: "meeple-1", boardGameId: "game-1" },
      update: {},
    });
  });

  it("removes the mark again", async () => {
    await setWantToPlayMarkAction("game-1", false);

    expect(prismaMock.gameWantToPlay.deleteMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", boardGameId: "game-1" },
    });
    expect(prismaMock.gameWantToPlay.upsert).not.toHaveBeenCalled();
  });
});
