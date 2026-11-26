import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";

afterEach(() => {
  vi.clearAllMocks();
});

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

const { createBoardGame, updateBoardGame } = await import("./board-games");

const VALID_INPUT = { title: "Arche Nova" };
const VALID_EAN = "5901234123457";
const VALID_EAN_2 = "9783897775329";

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
  prismaMock.member.findUnique.mockResolvedValue({ id: "member-1" } as never);
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
    mockPermissionKeys([]);

    const result = await createBoardGame(VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("rejects when the title is missing", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");

    const result = await createBoardGame({ title: "" });

    expect(result).toEqual({ error: "Bitte einen Titel angeben." });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid ean", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");

    const result = await createBoardGame({ ...VALID_INPUT, eans: ["12345"] });

    expect(result).toEqual({
      error: "Diese EAN ist ungültig. Bitte die Prüfziffer kontrollieren.",
      invalidEan: true,
    });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("creates a new title, its first copy's slug and an initial holding into Unsortiert", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.create.mockResolvedValue({
      id: "game-1",
      title: "Arche Nova",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-1" } as never);

    const result = await createBoardGame(VALID_INPUT);

    expect(result).toEqual({
      success: true,
      id: "copy-1",
      boardGameId: "game-1",
      hint: undefined,
    });
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

  it("creates BoardGameAlternateName rows from the BGG-Import-Vorschau (#187)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.create.mockResolvedValue({
      id: "game-1",
      title: "Ark Nova",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-1" } as never);

    await createBoardGame({
      ...VALID_INPUT,
      alternateNames: ["Ark Nova (Deutsch)"],
    });

    expect(prismaMock.boardGameAlternateName.createMany).toHaveBeenCalledWith({
      data: [{ boardGameId: "game-1", name: "Ark Nova (Deutsch)" }],
    });
  });

  it("does not duplicate alternate names when reusing an existing title by bggId", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "existing-title",
      title: "Ark Nova",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-1" } as never);

    await createBoardGame({
      ...VALID_INPUT,
      bggId: 342942,
      alternateNames: ["Ark Nova (Deutsch)"],
    });

    expect(prismaMock.boardGameAlternateName.createMany).not.toHaveBeenCalled();
  });

  it("places the first copy in the given unit instead of Unsortiert when a placement is set (#121/#122)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.create.mockResolvedValue({
      id: "game-1",
      title: "Arche Nova",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-1" } as never);

    await createBoardGame({
      ...VALID_INPUT,
      placement: { unitId: "unit-shelf-a" },
    });

    expect(prismaMock.storageUnit.upsert).not.toHaveBeenCalled();
    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitId: "unit-shelf-a",
        origin: "INITIAL",
      }),
    });
  });

  it("places the first copy with the creator when placement is self", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.create.mockResolvedValue({
      id: "game-1",
      title: "Arche Nova",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-1" } as never);

    await createBoardGame({ ...VALID_INPUT, placement: { self: true } });

    expect(prismaMock.storageUnit.upsert).not.toHaveBeenCalled();
    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vereinsmitgliedId: "member-1",
        unitId: null,
        origin: "INITIAL",
      }),
    });
  });

  it("rejects placement:self when the creator has no linked Vereinsmitglied (#333)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.member.findUnique.mockResolvedValue(null);

    const result = await createBoardGame({
      ...VALID_INPUT,
      placement: { self: true },
    });

    expect(result).toEqual({
      error: expect.stringContaining("Vereinsmitglied verknüpft"),
    });
    expect(prismaMock.gameHolding.create).not.toHaveBeenCalled();
  });

  it("resolves a copy-slug collision with a numeric suffix", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
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
    mockPermissionKeys("all");
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-1",
      title: "Arche Nova",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-2" } as never);

    const result = await createBoardGame({ ...VALID_INPUT, bggId: 342942 });

    expect(result).toEqual({
      success: true,
      id: "copy-2",
      boardGameId: "game-1",
      hint: undefined,
    });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
    expect(prismaMock.gameCopy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ boardGameId: "game-1" }),
    });
  });

  it("rejects creating a second title with the same name, even without a bggId (#183)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.findFirst.mockResolvedValue({
      id: "game-existing",
      title: "Arche Nova",
    } as never);

    const result = await createBoardGame(VALID_INPUT);

    expect(result).toEqual({
      error:
        "„Arche Nova“ existiert bereits im Bestand. Bitte über „Weiteres Exemplar anlegen“ eine weitere Kopie dieses Titels anlegen, statt einen zweiten Titel mit demselben Namen zu erzeugen.",
    });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
    expect(prismaMock.gameCopy.create).not.toHaveBeenCalled();
  });

  it("rejects a same-named title even when a (different) bggId is given", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    // No title shares this bggId, but a different title row has the same name.
    prismaMock.boardGame.findUnique.mockResolvedValue(null);
    prismaMock.boardGame.findFirst.mockResolvedValue({
      id: "game-existing",
      title: "Arche Nova",
    } as never);

    const result = await createBoardGame({ ...VALID_INPUT, bggId: 999999 });

    expect(result).toEqual({
      error:
        "„Arche Nova“ existiert bereits im Bestand. Bitte über „Weiteres Exemplar anlegen“ eine weitere Kopie dieses Titels anlegen, statt einen zweiten Titel mit demselben Namen zu erzeugen.",
    });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("skips the title-collision check when the bggId already reuses an existing title", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-1",
      title: "Arche Nova",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-2" } as never);

    const result = await createBoardGame({ ...VALID_INPUT, bggId: 342942 });

    expect(result.success).toBe(true);
    expect(prismaMock.boardGame.findFirst).not.toHaveBeenCalled();
  });

  it("stores several eans with the new title", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.create.mockResolvedValue({
      id: "game-2",
      title: "Arche Nova",
    } as never);

    const result = await createBoardGame({
      ...VALID_INPUT,
      eans: [VALID_EAN, VALID_EAN_2, VALID_EAN],
    });

    expect(result.success).toBe(true);
    expect(prismaMock.boardGameEan.createMany).toHaveBeenCalledWith({
      data: [
        { boardGameId: "game-2", ean: VALID_EAN },
        { boardGameId: "game-2", ean: VALID_EAN_2 },
      ],
      skipDuplicates: true,
    });
  });

  it("creates without eans when none are given", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.create.mockResolvedValue({
      id: "game-2",
      title: "Arche Nova",
    } as never);

    await createBoardGame(VALID_INPUT);

    expect(prismaMock.boardGameEan.createMany).not.toHaveBeenCalled();
  });

  it("rejects an ean owned by another title and names it", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGame.create.mockResolvedValue({ id: "game-2" } as never);
    prismaMock.boardGameEan.findFirst.mockResolvedValue({
      ean: VALID_EAN,
      boardGame: { title: "Catan" },
    } as never);

    const result = await createBoardGame({ ...VALID_INPUT, eans: [VALID_EAN] });

    expect(result).toEqual({ error: expect.stringContaining("„Catan“") });
  });
});

describe("updateBoardGame", () => {
  beforeEach(() => {
    prismaMock.boardGame.update.mockResolvedValue({
      slug: "arche-nova",
    } as never);
  });

  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys([]);

    const result = await updateBoardGame("game-1", VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("updates the title when authorized and valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");

    prismaMock.boardGameEan.findMany.mockResolvedValue([] as never);

    const result = await updateBoardGame("game-1", VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: expect.objectContaining({ title: "Arche Nova" }),
    });
  });

  it("rejects an invalid ean", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");

    const result = await updateBoardGame("game-1", {
      ...VALID_INPUT,
      eans: ["x"],
    });

    expect(result).toEqual({
      error: "Diese EAN ist ungültig. Bitte die Prüfziffer kontrollieren.",
      invalidEan: true,
    });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("sets the title's eans, excluding itself from the conflict check", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGameEan.findMany.mockResolvedValue([
      { ean: VALID_EAN },
    ] as never);

    await updateBoardGame("game-1", {
      ...VALID_INPUT,
      eans: [VALID_EAN, VALID_EAN_2],
    });

    expect(prismaMock.boardGameEan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ean: { in: [VALID_EAN, VALID_EAN_2] },
          boardGameId: { not: "game-1" },
        },
      }),
    );
    expect(prismaMock.boardGameEan.deleteMany).toHaveBeenCalledWith({
      where: {
        boardGameId: "game-1",
        ean: { notIn: [VALID_EAN, VALID_EAN_2] },
      },
    });
    expect(prismaMock.boardGameEan.createMany).toHaveBeenCalledWith({
      data: [{ boardGameId: "game-1", ean: VALID_EAN_2 }],
    });
  });

  it("removes all eans when none are given", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGameEan.findMany.mockResolvedValue([] as never);

    await updateBoardGame("game-1", { ...VALID_INPUT, eans: [] });

    expect(prismaMock.boardGameEan.deleteMany).toHaveBeenCalledWith({
      where: { boardGameId: "game-1", ean: { notIn: [] } },
    });
  });

  it("reports an ean conflict with the owning title", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockPermissionKeys("all");
    prismaMock.boardGameEan.findFirst.mockResolvedValue({
      ean: VALID_EAN,
      boardGame: { title: "Catan" },
    } as never);

    const result = await updateBoardGame("game-1", {
      ...VALID_INPUT,
      eans: [VALID_EAN],
    });

    expect(result).toEqual({ error: expect.stringContaining("„Catan“") });
  });
});
