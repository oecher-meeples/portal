import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const ensureMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, ensureMeeple: ensureMeepleMock };
});

const fetchBggGameMock = vi.fn();
vi.mock("@/lib/bgg/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/bgg/client")>(
      "@/lib/bgg/client",
    );
  return {
    ...actual,
    fetchBggGame: (...args: unknown[]) => fetchBggGameMock(...args),
  };
});

const { BggApiError, BggNotFoundError } = await import("@/lib/bgg/client");
const {
  createBoardGame,
  updateBoardGame,
  previewBggImport,
  findOrCreateBoardGameTitle,
  assignExpansion,
  removeExpansionAssignment,
} = await import("./board-games");

const VALID_INPUT = { title: "Arche Nova" };
const VALID_EAN = "5901234123457";

beforeEach(() => {
  ensureMeepleMock.mockResolvedValue({ id: "meeple-1" });
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  prismaMock.storageUnit.upsert.mockResolvedValue({
    id: "unit-unsortiert",
  } as never);
  prismaMock.gameHolding.create.mockResolvedValue({} as never);
  prismaMock.gameCopy.findFirst.mockResolvedValue(null);
  prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-1" } as never);
  prismaMock.boardGame.count.mockResolvedValue(0);
  prismaMock.boardGame.findUnique.mockResolvedValue(null);
  prismaMock.boardGame.findFirst.mockResolvedValue(null);
});

describe("createBoardGame", () => {
  it("rejects when there is no logged-in user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await createBoardGame(VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await createBoardGame(VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("rejects when the title is missing", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await createBoardGame({ title: "" });

    expect(result).toEqual({ error: "Bitte einen Titel angeben." });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid ean", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await createBoardGame({ ...VALID_INPUT, ean: "12345" });

    expect(result).toEqual({
      error: "Diese EAN ist ungültig. Bitte die Prüfziffer kontrollieren.",
    });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("creates a new title, its first copy's slug and an initial holding into Unsortiert", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.create.mockResolvedValue({
      id: "game-1",
      title: "Arche Nova",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-1" } as never);

    const result = await createBoardGame(VALID_INPUT);

    expect(result).toEqual({ success: true, id: "copy-1", hint: undefined });
    expect(prismaMock.boardGame.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Arche Nova" }),
    });
    expect(prismaMock.gameCopy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "arche-nova",
        boardGameId: "game-1",
      }),
    });
    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameCopyId: "copy-1",
        unitId: "unit-unsortiert",
        origin: "INITIAL",
        recordedByMeepleId: "meeple-1",
      }),
    });
  });

  it("resolves a copy-slug collision with a numeric suffix", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.create.mockResolvedValue({
      id: "game-2",
      title: "Arche Nova",
    } as never);
    prismaMock.gameCopy.findFirst
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce(null);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-2" } as never);

    await createBoardGame(VALID_INPUT);

    expect(prismaMock.gameCopy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "arche-nova-2" }),
    });
  });

  it("reuses an existing title for a duplicate bggId instead of creating a second title (second copy, ADR 0008)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-1",
      title: "Arche Nova",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-2" } as never);

    const result = await createBoardGame({ ...VALID_INPUT, bggId: 342942 });

    expect(result).toEqual({ success: true, id: "copy-2", hint: undefined });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
    expect(prismaMock.gameCopy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ boardGameId: "game-1" }),
    });
  });

  it("accepts a duplicate ean and reports it as a hint, not an error", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.count.mockResolvedValue(1);
    prismaMock.boardGame.create.mockResolvedValue({
      id: "game-2",
      title: "Arche Nova",
    } as never);

    const result = await createBoardGame({ ...VALID_INPUT, ean: VALID_EAN });

    expect(result.success).toBe(true);
    expect(result.hint).toMatch(/bereits einem anderen Spiel/);
    expect(prismaMock.boardGame.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ean: VALID_EAN }),
    });
  });
});

describe("findOrCreateBoardGameTitle", () => {
  it("creates a new title when no bggId is given", async () => {
    prismaMock.boardGame.create.mockResolvedValue({ id: "game-1" } as never);

    await findOrCreateBoardGameTitle(VALID_INPUT);

    expect(prismaMock.boardGame.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.boardGame.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Arche Nova",
        slug: "arche-nova",
      }),
    });
  });

  it("resolves a title-slug collision with a numeric suffix", async () => {
    prismaMock.boardGame.findFirst
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce(null);
    prismaMock.boardGame.create.mockResolvedValue({ id: "game-2" } as never);

    await findOrCreateBoardGameTitle(VALID_INPUT);

    expect(prismaMock.boardGame.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "arche-nova-2" }),
    });
  });

  it("reuses the title found by bggId", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "existing-title",
    } as never);

    const result = await findOrCreateBoardGameTitle({
      ...VALID_INPUT,
      bggId: 342942,
    });

    expect(result).toEqual({ id: "existing-title" });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });
});

describe("updateBoardGame", () => {
  beforeEach(() => {
    prismaMock.gameCopy.findMany.mockResolvedValue([]);
  });

  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await updateBoardGame("game-1", VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("updates the title when authorized and valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await updateBoardGame("game-1", VALID_INPUT);

    expect(result).toEqual({ success: true, hint: undefined });
    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: expect.objectContaining({ title: "Arche Nova" }),
    });
  });

  it("rejects an invalid ean", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await updateBoardGame("game-1", {
      ...VALID_INPUT,
      ean: "x",
    });

    expect(result).toEqual({
      error: "Diese EAN ist ungültig. Bitte die Prüfziffer kontrollieren.",
    });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("excludes the title itself from the duplicate-ean check", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    await updateBoardGame("game-1", { ...VALID_INPUT, ean: VALID_EAN });

    expect(prismaMock.boardGame.count).toHaveBeenCalledWith({
      where: { ean: VALID_EAN, id: { not: "game-1" } },
    });
  });
});

describe("previewBggImport", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await previewBggImport(342942);

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." });
    expect(fetchBggGameMock).not.toHaveBeenCalled();
  });

  it("returns the mapped preview data without persisting anything", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    const bggData = { title: "Ark Nova", mechanics: [] };
    fetchBggGameMock.mockResolvedValue(bggData);

    const result = await previewBggImport(342942);

    expect(result).toEqual({ success: true, data: bggData });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("translates a BggNotFoundError into a speaking error", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    fetchBggGameMock.mockRejectedValue(new BggNotFoundError(999999999));

    const result = await previewBggImport(999999999);

    expect(result).toEqual({
      success: false,
      error: "BoardGameGeek-Eintrag mit ID 999999999 wurde nicht gefunden.",
    });
  });

  it("translates a BggApiError into a speaking error", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    fetchBggGameMock.mockRejectedValue(new BggApiError("boom", 503));

    const result = await previewBggImport(342942);

    expect(result).toEqual({
      success: false,
      error:
        "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
    });
  });
});

describe("assignExpansion", () => {
  beforeEach(() => {
    prismaMock.gameCopy.findMany.mockResolvedValue([]);
  });

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
});

describe("removeExpansionAssignment", () => {
  beforeEach(() => {
    prismaMock.gameCopy.findMany.mockResolvedValue([]);
  });

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
});
