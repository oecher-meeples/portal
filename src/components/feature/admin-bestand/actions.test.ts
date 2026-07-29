import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const fetchBggGameMock = vi.fn();
vi.mock("@/lib/bgg/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bgg/client")>(
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
  deinventoriseBoardGame,
} = await import("./actions");

const VALID_INPUT = {
  title: "Arche Nova",
  quantity: 1,
};

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

    const result = await createBoardGame({ title: "", quantity: 1 });

    expect(result).toEqual({ error: "Bitte einen Titel angeben." });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });

  it("creates the game when authorized and valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.findFirst.mockResolvedValue(null);
    prismaMock.boardGame.create.mockResolvedValue({ id: "game-1" } as never);

    const result = await createBoardGame(VALID_INPUT);

    expect(result).toEqual({ success: true, id: "game-1" });
    expect(prismaMock.boardGame.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "arche-nova", title: "Arche Nova" }),
    });
  });

  it("resolves a slug collision with a numeric suffix", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.findFirst
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce(null);
    prismaMock.boardGame.create.mockResolvedValue({ id: "game-2" } as never);

    await createBoardGame(VALID_INPUT);

    expect(prismaMock.boardGame.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "arche-nova-2" }),
    });
  });

  it("rejects with a speaking error when the bggId is already taken", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "existing",
    } as never);

    const result = await createBoardGame({ ...VALID_INPUT, bggId: 342942 });

    expect(result).toEqual({
      error: "Spiel mit dieser BGG-ID existiert bereits.",
    });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
  });
});

describe("updateBoardGame", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await updateBoardGame("game-1", VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("updates the game when authorized and valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.findFirst.mockResolvedValue(null);

    const result = await updateBoardGame("game-1", VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: expect.objectContaining({ title: "Arche Nova" }),
    });
  });
});

describe("previewBggImport", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await previewBggImport(342942);

    expect(result).toEqual({ error: "Keine Berechtigung." });
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
      error: "BoardGameGeek-Eintrag mit ID 999999999 wurde nicht gefunden.",
    });
  });

  it("translates a BggApiError into a speaking error", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    fetchBggGameMock.mockRejectedValue(new BggApiError("boom", 503));

    const result = await previewBggImport(342942);

    expect(result).toEqual({
      error:
        "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
    });
  });
});

describe("deinventoriseBoardGame", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await deinventoriseBoardGame("game-1", "Verkauft");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("rejects when the reason is empty", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await deinventoriseBoardGame("game-1", "   ");

    expect(result).toEqual({
      error: "Bitte einen Grund für die Deinventarisierung angeben.",
    });
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
  });

  it("sets status, archivedAt and archivedReason when authorized and valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await deinventoriseBoardGame("game-1", "Verkauft 2026");

    expect(result).toEqual({ success: true });
    expect(prismaMock.boardGame.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: {
        status: "DEINVENTARISED",
        archivedAt: expect.any(Date),
        archivedReason: "Verkauft 2026",
      },
    });
  });
});
