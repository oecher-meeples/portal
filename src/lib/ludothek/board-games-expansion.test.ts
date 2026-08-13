import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const { assignExpansion, removeExpansionAssignment, findExpansionAssignmentOptions } =
  await import("./board-games");

beforeEach(() => {
  prismaMock.boardGame.findMany.mockResolvedValue([]);
});

describe("assignExpansion", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await assignExpansion("base-1", "expansion-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.gameCollection.upsert).not.toHaveBeenCalled();
  });

  it("rejects assigning a game as its own expansion", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await assignExpansion("game-1", "game-1");

    expect(result).toEqual({
      error: "Ein Spiel kann nicht seine eigene Erweiterung sein.",
    });
    expect(prismaMock.gameCollection.upsert).not.toHaveBeenCalled();
  });

  it("upserts the GameCollection row when authorized and valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await assignExpansion("base-1", "expansion-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCollection.upsert).toHaveBeenCalledWith({
      where: {
        baseGameId_expansionId: {
          baseGameId: "base-1",
          expansionId: "expansion-1",
        },
      },
      update: {},
      create: { baseGameId: "base-1", expansionId: "expansion-1" },
    });
  });

  it("sets the expansion's kind to BOARDGAME_EXPANSION if not already set", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    await assignExpansion("base-1", "expansion-1");

    expect(prismaMock.boardGame.updateMany).toHaveBeenCalledWith({
      where: { id: "expansion-1", kind: { not: "BOARDGAME_EXPANSION" } },
      data: { kind: "BOARDGAME_EXPANSION" },
    });
  });
});

describe("removeExpansionAssignment", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await removeExpansionAssignment("base-1", "expansion-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.gameCollection.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes the GameCollection row when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await removeExpansionAssignment("base-1", "expansion-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCollection.deleteMany).toHaveBeenCalledWith({
      where: { baseGameId: "base-1", expansionId: "expansion-1" },
    });
  });

  it("leaves the expansion's kind untouched — no fallback on removal", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    await removeExpansionAssignment("base-1", "expansion-1");

    expect(prismaMock.boardGame.updateMany).not.toHaveBeenCalled();
  });
});

describe("findExpansionAssignmentOptions", () => {
  it("filters to BOARDGAME-only candidates for a base-game assignment (game is an expansion)", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([]);

    await findExpansionAssignmentOptions("BOARDGAME_EXPANSION", ["id-1"]);

    expect(prismaMock.boardGame.findMany).toHaveBeenCalledWith({
      where: { id: { notIn: ["id-1"] }, kind: "BOARDGAME" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  });

  it("allows any kind as an expansion candidate (game is a base game)", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([]);

    await findExpansionAssignmentOptions("BOARDGAME", ["id-1"]);

    expect(prismaMock.boardGame.findMany).toHaveBeenCalledWith({
      where: { id: { notIn: ["id-1"] } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  });
});
