import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const {
  addAlternateName,
  deleteAlternateName,
  promoteAlternateNameToTitle,
  promoteAlternateNameToSecondaryTitle,
  swapTitleAndSecondaryTitle,
  clearSecondaryTitle,
  listAlternateNames,
} = await import("./board-game-alternate-names");

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.rolePermission.count.mockResolvedValue(1);
});

describe("addAlternateName", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await addAlternateName("game-1", "Die Siedler von Catan");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGameAlternateName.create).not.toHaveBeenCalled();
  });

  it("rejects a blank name", async () => {
    const result = await addAlternateName("game-1", "   ");

    expect(result).toEqual({ error: "Bitte einen Namen angeben." });
    expect(prismaMock.boardGameAlternateName.create).not.toHaveBeenCalled();
  });

  it("creates a new row for the title", async () => {
    prismaMock.boardGameAlternateName.create.mockResolvedValue({
      id: "alt-1",
      boardGameId: "game-1",
      name: "Die Siedler von Catan",
      note: null,
      createdAt: new Date(),
    });

    const result = await addAlternateName(
      "game-1",
      "Die Siedler von Catan",
      "Ursprünglicher deutscher Titel",
    );

    expect(prismaMock.boardGameAlternateName.create).toHaveBeenCalledWith({
      data: {
        boardGameId: "game-1",
        name: "Die Siedler von Catan",
        note: "Ursprünglicher deutscher Titel",
      },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("deleteAlternateName", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await deleteAlternateName("alt-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGameAlternateName.delete).not.toHaveBeenCalled();
  });

  it("deletes the row", async () => {
    prismaMock.boardGameAlternateName.delete.mockResolvedValue({
      id: "alt-1",
      boardGameId: "game-1",
      name: "Foo",
      note: null,
      createdAt: new Date(),
    });

    const result = await deleteAlternateName("alt-1");

    expect(prismaMock.boardGameAlternateName.delete).toHaveBeenCalledWith({
      where: { id: "alt-1" },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("promoteAlternateNameToTitle", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await promoteAlternateNameToTitle("alt-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns an error when the alternate name no longer exists", async () => {
    prismaMock.$transaction.mockImplementation((arg) =>
      typeof arg === "function" ? arg(prismaMock) : Promise.all(arg),
    );
    prismaMock.boardGameAlternateName.findUnique.mockResolvedValue(null);

    const result = await promoteAlternateNameToTitle("alt-1");

    expect(result).toEqual({ error: "Alternativname wurde nicht gefunden." });
  });

  it("swaps BoardGame.title and the alternate name's value, keeping the row and slug", async () => {
    prismaMock.$transaction.mockImplementation((arg) =>
      typeof arg === "function" ? arg(prismaMock) : Promise.all(arg),
    );
    prismaMock.boardGameAlternateName.findUnique.mockResolvedValue({
      id: "alt-1",
      boardGameId: "game-1",
      name: "Die Siedler von Catan",
      note: null,
      createdAt: new Date(),
      boardGame: { id: "game-1", title: "Catan" },
    } as never);

    const result = await promoteAlternateNameToTitle("alt-1");

    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { title: "Die Siedler von Catan" },
    });
    expect(prismaMock.boardGameAlternateName.update).toHaveBeenCalledWith({
      where: { id: "alt-1" },
      data: { name: "Catan" },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("promoteAlternateNameToSecondaryTitle (#203-Folge)", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await promoteAlternateNameToSecondaryTitle("alt-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns an error when the alternate name no longer exists", async () => {
    prismaMock.$transaction.mockImplementation((arg) =>
      typeof arg === "function" ? arg(prismaMock) : Promise.all(arg),
    );
    prismaMock.boardGameAlternateName.findUnique.mockResolvedValue(null);

    const result = await promoteAlternateNameToSecondaryTitle("alt-1");

    expect(result).toEqual({ error: "Alternativname wurde nicht gefunden." });
  });

  it("swaps the row with an already-set secondary title", async () => {
    prismaMock.$transaction.mockImplementation((arg) =>
      typeof arg === "function" ? arg(prismaMock) : Promise.all(arg),
    );
    prismaMock.boardGameAlternateName.findUnique.mockResolvedValue({
      id: "alt-1",
      boardGameId: "game-1",
      name: "Ark Nova",
      note: null,
      createdAt: new Date(),
      boardGame: { id: "game-1", secondaryTitle: "Arche Nova (DE)" },
    } as never);

    const result = await promoteAlternateNameToSecondaryTitle("alt-1");

    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { secondaryTitle: "Ark Nova" },
    });
    expect(prismaMock.boardGameAlternateName.update).toHaveBeenCalledWith({
      where: { id: "alt-1" },
      data: { name: "Arche Nova (DE)" },
    });
    expect(prismaMock.boardGameAlternateName.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("deletes the row instead of leaving it empty when no secondary title was set", async () => {
    prismaMock.$transaction.mockImplementation((arg) =>
      typeof arg === "function" ? arg(prismaMock) : Promise.all(arg),
    );
    prismaMock.boardGameAlternateName.findUnique.mockResolvedValue({
      id: "alt-1",
      boardGameId: "game-1",
      name: "Ark Nova",
      note: null,
      createdAt: new Date(),
      boardGame: { id: "game-1", secondaryTitle: null },
    } as never);

    const result = await promoteAlternateNameToSecondaryTitle("alt-1");

    expect(prismaMock.boardGameAlternateName.update).not.toHaveBeenCalled();
    expect(prismaMock.boardGameAlternateName.delete).toHaveBeenCalledWith({
      where: { id: "alt-1" },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("swapTitleAndSecondaryTitle (#203-Folge)", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await swapTitleAndSecondaryTitle("game-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("returns an error when the title no longer exists", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue(null);

    const result = await swapTitleAndSecondaryTitle("game-1");

    expect(result).toEqual({ error: "Titel wurde nicht gefunden." });
  });

  it("rejects without a secondary title, to avoid emptying the required title", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      title: "Arche Nova",
      secondaryTitle: null,
    } as never);

    const result = await swapTitleAndSecondaryTitle("game-1");

    expect(result).toEqual({ error: "Kein Sekundärtitel gesetzt." });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("swaps title and secondary title", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      title: "Arche Nova",
      secondaryTitle: "Ark Nova",
    } as never);

    const result = await swapTitleAndSecondaryTitle("game-1");

    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { title: "Ark Nova", secondaryTitle: "Arche Nova" },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("clearSecondaryTitle (#203-Folge)", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await clearSecondaryTitle("game-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("sets the secondary title to null", async () => {
    const result = await clearSecondaryTitle("game-1");

    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { secondaryTitle: null },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("listAlternateNames", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await listAlternateNames("game-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGameAlternateName.findMany).not.toHaveBeenCalled();
  });

  it("returns the alternate names for the title", async () => {
    prismaMock.boardGameAlternateName.findMany.mockResolvedValue([
      { id: "alt-1", name: "Die Siedler von Catan", note: null },
    ] as never);

    const result = await listAlternateNames("game-1");

    expect(prismaMock.boardGameAlternateName.findMany).toHaveBeenCalledWith({
      where: { boardGameId: "game-1" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, note: true },
    });
    expect(result).toEqual({
      success: true,
      alternateNames: [
        { id: "alt-1", name: "Die Siedler von Catan", note: null },
      ],
    });
  });
});
