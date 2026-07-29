import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/meeples", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/meeples")>("@/lib/meeples");
  return { ...actual, requireMeeple: requireMeepleMock };
});

const { addExplainerGame, updateExplainerGameLevel, removeExplainerGame } =
  await import("./actions");

class RedirectError extends Error {}

const MEEPLE = { id: "meeple-1", neonAuthUserId: "auth-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(MEEPLE);
});

describe("without a session", () => {
  it("writes nothing", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(
      addExplainerGame("game-1", "WITH_MANUAL"),
    ).rejects.toThrow(RedirectError);
    await expect(
      updateExplainerGameLevel("game-1", "BY_HEART"),
    ).rejects.toThrow(RedirectError);
    await expect(removeExplainerGame("game-1")).rejects.toThrow(RedirectError);

    expect(prismaMock.explainerGame.upsert).not.toHaveBeenCalled();
    expect(prismaMock.explainerGame.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.explainerGame.deleteMany).not.toHaveBeenCalled();
  });
});

describe("addExplainerGame", () => {
  it("upserts on the meeple/boardGame constraint instead of duplicating", async () => {
    prismaMock.explainerGame.upsert.mockResolvedValue({} as never);

    const result = await addExplainerGame("game-1", "WITHOUT_MANUAL");

    expect(result).toEqual({ success: true });
    expect(prismaMock.explainerGame.upsert).toHaveBeenCalledWith({
      where: {
        meepleId_boardGameId: { meepleId: "meeple-1", boardGameId: "game-1" },
      },
      update: { level: "WITHOUT_MANUAL" },
      create: { meepleId: "meeple-1", boardGameId: "game-1", level: "WITHOUT_MANUAL" },
    });
  });

  it("a second call for the same game updates the level via upsert, not a duplicate create", async () => {
    prismaMock.explainerGame.upsert.mockResolvedValue({} as never);

    await addExplainerGame("game-1", "WITH_MANUAL");
    await addExplainerGame("game-1", "BY_HEART");

    expect(prismaMock.explainerGame.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.explainerGame.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: { level: "BY_HEART" },
        create: { meepleId: "meeple-1", boardGameId: "game-1", level: "BY_HEART" },
      }),
    );
    expect(prismaMock.explainerGame.create).not.toHaveBeenCalled();
  });
});

describe("updateExplainerGameLevel", () => {
  it("only updates the caller's own entry", async () => {
    prismaMock.explainerGame.updateMany.mockResolvedValue({ count: 1 } as never);

    const result = await updateExplainerGameLevel("game-1", "BY_HEART");

    expect(result).toEqual({ success: true });
    expect(prismaMock.explainerGame.updateMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", boardGameId: "game-1" },
      data: { level: "BY_HEART" },
    });
  });

  it("reports an error when no own entry exists", async () => {
    prismaMock.explainerGame.updateMany.mockResolvedValue({ count: 0 } as never);

    const result = await updateExplainerGameLevel("game-1", "BY_HEART");

    expect(result).toEqual({
      error: "Kein eigener Eintrag für dieses Spiel gefunden.",
    });
  });
});

describe("removeExplainerGame", () => {
  it("deletes exactly the caller's own entry", async () => {
    prismaMock.explainerGame.deleteMany.mockResolvedValue({ count: 1 } as never);

    const result = await removeExplainerGame("game-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.explainerGame.deleteMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", boardGameId: "game-1" },
    });
  });
});
