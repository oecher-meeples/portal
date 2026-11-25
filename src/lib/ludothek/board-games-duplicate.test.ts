import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";
import { NOT_CATALOG_STUB_WHERE } from "@/lib/ludothek/board-game-stub";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).currentUserGuards(),
);

const {
  findOrCreateBoardGameTitle,
  findDuplicateBoardGame,
  getBoardGameTitleForEdit,
} = await import("./board-games");

const VALID_INPUT = { title: "Arche Nova" };

beforeEach(() => {
  prismaMock.boardGame.findUnique.mockResolvedValue(null);
  prismaMock.boardGame.findFirst.mockResolvedValue(null);
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

describe("findOrCreateBoardGameTitle – Stub-Aufwertung (#637)", () => {
  const STUB = {
    id: "stub-1",
    description: null,
    minPlayers: null,
    maxPlayers: null,
  };

  it("wertet einen Stub mit vollständigen Daten auf", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue(STUB as never);
    prismaMock.boardGame.update.mockResolvedValue({ id: "stub-1" } as never);

    await findOrCreateBoardGameTitle({
      ...VALID_INPUT,
      bggId: 342942,
      minPlayers: 1,
      maxPlayers: 4,
    });

    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "stub-1" },
      data: expect.objectContaining({ minPlayers: 1, maxPlayers: 4 }),
    });
  });

  it("lässt einen Stub unverändert, wenn der Aufrufer selbst nur Stub-Daten liefert", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue(STUB as never);

    await findOrCreateBoardGameTitle({ ...VALID_INPUT, bggId: 342942 });

    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("überschreibt einen vollständigen Titel nicht", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      ...STUB,
      description: "Vollständig",
    } as never);

    await findOrCreateBoardGameTitle({
      ...VALID_INPUT,
      bggId: 342942,
      minPlayers: 1,
    });

    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });
});

describe("findDuplicateBoardGame", () => {
  it("ignoriert einen Stub als Duplikat (#637)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "stub-1",
      title: "Ark Nova",
      description: null,
      minPlayers: null,
      maxPlayers: null,
    } as never);
    prismaMock.boardGame.findFirst.mockResolvedValue(null);

    expect(await findDuplicateBoardGame("Ark Nova", 342942)).toBeNull();
  });

  it("returns null when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys([]);

    const result = await findDuplicateBoardGame("Arche Nova");

    expect(result).toBeNull();
    expect(prismaMock.boardGame.findUnique).not.toHaveBeenCalled();
  });

  it("matches by bggId before falling back to the title", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-1",
      title: "Ark Nova",
      description: "Zoo",
      minPlayers: 1,
      maxPlayers: 4,
    } as never);

    const result = await findDuplicateBoardGame("Ark Nova", 342942);

    expect(result).toEqual({ id: "game-1", title: "Ark Nova" });
    expect(prismaMock.boardGame.findUnique).toHaveBeenCalledWith({
      where: { bggId: 342942 },
      select: {
        id: true,
        title: true,
        description: true,
        minPlayers: true,
        maxPlayers: true,
      },
    });
    expect(prismaMock.boardGame.findFirst).not.toHaveBeenCalled();
  });

  it("falls back to a case-insensitive exact title match when no bggId matches", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.findUnique.mockResolvedValue(null);
    prismaMock.boardGame.findFirst.mockResolvedValue({
      id: "game-1",
      title: "Arche Nova",
    } as never);

    const result = await findDuplicateBoardGame("arche nova");

    expect(result).toEqual({ id: "game-1", title: "Arche Nova" });
    expect(prismaMock.boardGame.findFirst).toHaveBeenCalledWith({
      where: {
        title: { equals: "arche nova", mode: "insensitive" },
        ...NOT_CATALOG_STUB_WHERE,
      },
      select: { id: true, title: true },
    });
  });

  it("returns null for a blank title and no bggId", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");

    const result = await findDuplicateBoardGame("   ");

    expect(result).toBeNull();
    expect(prismaMock.boardGame.findFirst).not.toHaveBeenCalled();
  });
});

describe("getBoardGameTitleForEdit", () => {
  it("returns null when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys([]);

    const result = await getBoardGameTitleForEdit("game-1");

    expect(result).toBeNull();
    expect(prismaMock.boardGame.findUnique).not.toHaveBeenCalled();
  });

  it("returns the title's full field set for the 'Titel laden' flow (#183)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.findUnique.mockResolvedValue({
      title: "Arche Nova",
      ean: "5901234123457",
      kind: "BOARDGAME",
      bggId: 342942,
      minPlayers: 1,
      maxPlayers: 4,
      playTimeMinutes: 150,
      weight: 3.7,
      imageUrl: null,
      description: null,
      mechanics: [],
      explainerVideoUrl: null,
      contributors: [],
      tags: [],
    } as never);

    const result = await getBoardGameTitleForEdit("game-1");

    expect(result).toEqual(
      expect.objectContaining({ title: "Arche Nova", bggId: 342942 }),
    );
    expect(prismaMock.boardGame.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "game-1" } }),
    );
  });
});
