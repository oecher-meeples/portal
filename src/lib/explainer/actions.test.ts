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

const requireActionPermissionMock = vi.fn();
vi.mock("@/lib/auth/action-guards", () => ({
  requireActionPermission: requireActionPermissionMock,
}));

const searchBoardGamesMock = vi.fn();
vi.mock("@/lib/explainer/game-list-queries", () => ({
  searchBoardGames: searchBoardGamesMock,
}));

const {
  addExplainerGameFromSearch,
  searchBoardGamesAction,
  setExplainerWanted,
  addExplainerGame,
  updateExplainerGameLevel,
  removeExplainerGame,
  removeAllExplainerGames,
} = await import("./actions");

class RedirectError extends Error {}

const MEEPLE = { id: "meeple-1", neonAuthUserId: "auth-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(MEEPLE);
});

describe("without a session", () => {
  it("writes nothing", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(addExplainerGame("game-1", "WITH_MANUAL")).rejects.toThrow(
      RedirectError,
    );
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
      create: {
        meepleId: "meeple-1",
        boardGameId: "game-1",
        level: "WITHOUT_MANUAL",
      },
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
        create: {
          meepleId: "meeple-1",
          boardGameId: "game-1",
          level: "BY_HEART",
        },
      }),
    );
    expect(prismaMock.explainerGame.create).not.toHaveBeenCalled();
  });
});

describe("updateExplainerGameLevel", () => {
  it("only updates the caller's own entry", async () => {
    prismaMock.explainerGame.updateMany.mockResolvedValue({
      count: 1,
    } as never);

    const result = await updateExplainerGameLevel("game-1", "BY_HEART");

    expect(result).toEqual({ success: true });
    expect(prismaMock.explainerGame.updateMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", boardGameId: "game-1" },
      data: { level: "BY_HEART" },
    });
  });

  it("reports an error when no own entry exists", async () => {
    prismaMock.explainerGame.updateMany.mockResolvedValue({
      count: 0,
    } as never);

    const result = await updateExplainerGameLevel("game-1", "BY_HEART");

    expect(result).toEqual({
      error: "Kein eigener Eintrag für dieses Spiel gefunden.",
    });
  });
});

describe("removeExplainerGame", () => {
  it("deletes exactly the caller's own entry", async () => {
    prismaMock.explainerGame.deleteMany.mockResolvedValue({
      count: 1,
    } as never);

    const result = await removeExplainerGame("game-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.explainerGame.deleteMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", boardGameId: "game-1" },
    });
  });
});

describe("removeAllExplainerGames", () => {
  it("deletes all of the caller's own entries", async () => {
    prismaMock.explainerGame.deleteMany.mockResolvedValue({
      count: 3,
    } as never);

    const result = await removeAllExplainerGames();

    expect(result).toEqual({ success: true });
    expect(prismaMock.explainerGame.deleteMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1" },
    });
  });
});

describe("addExplainerGameFromSearch", () => {
  it("creates with WITH_MANUAL but never overwrites an existing level", async () => {
    prismaMock.explainerGame.upsert.mockResolvedValue({} as never);

    const result = await addExplainerGameFromSearch("game-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.explainerGame.upsert).toHaveBeenCalledWith({
      where: {
        meepleId_boardGameId: { meepleId: "meeple-1", boardGameId: "game-1" },
      },
      update: {},
      create: {
        meepleId: "meeple-1",
        boardGameId: "game-1",
        level: "WITH_MANUAL",
      },
    });
  });

  it("rejects an empty game id", async () => {
    expect(await addExplainerGameFromSearch("")).toEqual({
      error: "Bitte ein Spiel auswählen.",
    });
    expect(prismaMock.explainerGame.upsert).not.toHaveBeenCalled();
  });
});

describe("searchBoardGamesAction", () => {
  it("delegates to the server-side search with a limit", async () => {
    searchBoardGamesMock.mockResolvedValue([{ id: "g", title: "Azul" }]);

    expect(await searchBoardGamesAction("azu", ["x"])).toEqual([
      { id: "g", title: "Azul" },
    ]);
    expect(searchBoardGamesMock).toHaveBeenCalledWith("azu", 10, ["x"]);
  });
});

describe("setExplainerWanted (#660)", () => {
  it("sets the flag for events:manage", async () => {
    requireActionPermissionMock.mockResolvedValue({});
    prismaMock.boardGame.updateMany.mockResolvedValue({ count: 1 } as never);

    expect(await setExplainerWanted("game-1", true)).toEqual({
      success: true,
    });
    expect(requireActionPermissionMock).toHaveBeenCalledWith("events:manage");
    expect(prismaMock.boardGame.updateMany).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { explainerWanted: true },
    });
  });

  it("removes the flag", async () => {
    requireActionPermissionMock.mockResolvedValue({});
    prismaMock.boardGame.updateMany.mockResolvedValue({ count: 1 } as never);

    await setExplainerWanted("game-1", false);

    expect(prismaMock.boardGame.updateMany).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { explainerWanted: false },
    });
  });

  it("changes nothing without the permission", async () => {
    requireActionPermissionMock.mockRejectedValue(new RedirectError("/403"));

    await expect(setExplainerWanted("game-1", true)).rejects.toThrow(
      RedirectError,
    );
    expect(prismaMock.boardGame.updateMany).not.toHaveBeenCalled();
  });

  it("reports an unknown game", async () => {
    requireActionPermissionMock.mockResolvedValue({});
    prismaMock.boardGame.updateMany.mockResolvedValue({ count: 0 } as never);

    expect(await setExplainerWanted("nope", true)).toEqual({
      error: "Spiel nicht gefunden.",
    });
  });
});
