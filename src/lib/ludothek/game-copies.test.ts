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

const {
  createGameCopy,
  updateGameCopy,
  deinventoriseGameCopy,
  requestCompletenessCheck,
} = await import("./game-copies");

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
});

describe("createGameCopy", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await createGameCopy("game-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.gameCopy.create).not.toHaveBeenCalled();
  });

  it("rejects when the title does not exist", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.findUnique.mockResolvedValue(null);

    const result = await createGameCopy("game-x");

    expect(result).toEqual({ error: "Titel wurde nicht gefunden." });
  });

  it("adds a second copy to an existing title with its own slug and holding", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-1",
      title: "Catan",
    } as never);
    prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-2" } as never);

    const result = await createGameCopy("game-1", { condition: "Neuwertig" });

    expect(result).toEqual({ success: true, id: "copy-2" });
    expect(prismaMock.gameCopy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "catan",
        boardGameId: "game-1",
        condition: "Neuwertig",
      }),
    });
    expect(prismaMock.gameHolding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameCopyId: "copy-2",
        unitId: "unit-unsortiert",
        origin: "INITIAL",
        recordedByMeepleId: "meeple-1",
      }),
    });
  });
});

describe("updateGameCopy", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await updateGameCopy("copy-1", { condition: "Gebraucht" });

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });

  it("updates the condition when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.gameCopy.update.mockResolvedValue({ slug: "catan" } as never);

    const result = await updateGameCopy("copy-1", { condition: "Gebraucht" });

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "copy-1" },
      data: { condition: "Gebraucht" },
    });
  });
});

describe("deinventoriseGameCopy", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await deinventoriseGameCopy("copy-1", "Verkauft");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });

  it("rejects when the reason is empty", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await deinventoriseGameCopy("copy-1", "   ");

    expect(result).toEqual({
      error: "Bitte einen Grund für die Deinventarisierung angeben.",
    });
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });

  it("sets status, archivedAt and archivedReason when authorized and valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.gameCopy.update.mockResolvedValue({
      id: "copy-1",
      slug: "arche-nova",
      condition: null,
      boardGame: { id: "game-1", title: "Arche Nova" },
    } as never);

    const result = await deinventoriseGameCopy("copy-1", "Verkauft 2026");

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "copy-1" },
      data: {
        status: "DEINVENTARISED",
        archivedAt: expect.any(Date),
        archivedReason: "Verkauft 2026",
      },
      include: { boardGame: { select: { id: true, title: true } } },
    });
  });

  it("leaves the copy's open holding untouched — only the inventory status changes", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.gameCopy.update.mockResolvedValue({
      id: "copy-1",
      slug: "arche-nova",
      condition: null,
      boardGame: { id: "game-1", title: "Arche Nova" },
    } as never);

    await deinventoriseGameCopy("copy-1", "Verkauft 2026");

    expect(prismaMock.gameHolding.update).not.toHaveBeenCalled();
    expect(prismaMock.gameHolding.updateMany).not.toHaveBeenCalled();
  });

  it("creates exactly one spare part listing when the checkbox is set", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    ensureMeepleMock.mockResolvedValue({ id: "admin-meeple" });
    prismaMock.gameCopy.update.mockResolvedValue({
      id: "copy-1",
      slug: "arche-nova",
      condition: "Gebraucht",
      boardGame: { id: "game-1", title: "Arche Nova" },
    } as never);

    const result = await deinventoriseGameCopy("copy-1", "Verkauft 2026", true);

    expect(result).toEqual({ success: true });
    expect(prismaMock.sparePartListing.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.sparePartListing.create).toHaveBeenCalledWith({
      data: {
        title: "Arche Nova",
        boardGameId: "game-1",
        condition: "Gebraucht",
        description: null,
        keeperMeepleId: "admin-meeple",
      },
    });
  });

  it("creates no spare part listing when the checkbox is unset", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.gameCopy.update.mockResolvedValue({
      id: "copy-1",
      slug: "arche-nova",
      condition: "Gebraucht",
      boardGame: { id: "game-1", title: "Arche Nova" },
    } as never);

    await deinventoriseGameCopy("copy-1", "Verkauft 2026");

    expect(prismaMock.sparePartListing.create).not.toHaveBeenCalled();
  });
});

describe("requestCompletenessCheck", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await requestCompletenessCheck("copy-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });

  it("sets the completeness-check flag", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await requestCompletenessCheck("copy-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "copy-1" },
      data: { needsCompletenessCheck: true },
    });
  });
});
