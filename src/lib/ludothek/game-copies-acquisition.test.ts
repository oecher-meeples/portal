import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";

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

const { createGameCopy, updateGameCopy } = await import("./game-copies");

/** Wert und „Erhalten am" eines Exemplars (#615). */
const ACQUIRED_ON = new Date("2024-03-05T00:00:00.000Z");

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  mockPermissionKeys("all");
  ensureMeepleMock.mockResolvedValue({ id: "meeple-1" });
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  prismaMock.storageUnit.upsert.mockResolvedValue({
    id: "unit-unsortiert",
  } as never);
  prismaMock.gameHolding.create.mockResolvedValue({} as never);
  prismaMock.gameCopy.findFirst.mockResolvedValue(null);
  prismaMock.boardGame.findUnique.mockResolvedValue({
    id: "game-1",
    title: "Catan",
  } as never);
  prismaMock.gameCopy.create.mockResolvedValue({ id: "copy-2" } as never);
  prismaMock.gameCopy.findUnique.mockResolvedValue({
    boardGameId: "game-1",
  } as never);
  prismaMock.gameCopy.update.mockResolvedValue({
    boardGame: { slug: "catan" },
  } as never);
});

describe("createGameCopy — Wert und „Erhalten am“ (#615)", () => {
  it("speichert beide Felder am neuen Exemplar", async () => {
    const result = await createGameCopy("game-1", {
      valueCents: 2499,
      acquiredOn: ACQUIRED_ON,
    });

    expect(result).toEqual({ success: true, id: "copy-2" });
    expect(prismaMock.gameCopy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        valueCents: 2499,
        acquiredOn: ACQUIRED_ON,
      }),
    });
  });

  it("speichert null, wenn beide Felder fehlen", async () => {
    await createGameCopy("game-1");

    expect(prismaMock.gameCopy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ valueCents: null, acquiredOn: null }),
    });
  });

  it("lehnt einen unlesbaren Wert ab, ohne anzulegen", async () => {
    const result = await createGameCopy("game-1", { valueCents: Number.NaN });

    expect(result).toEqual({
      error: "Wert muss ein Betrag in Euro sein, z. B. 24,99.",
    });
    expect(prismaMock.gameCopy.create).not.toHaveBeenCalled();
  });
});

describe("updateGameCopy — Wert und „Erhalten am“ (#615)", () => {
  it("setzt beide Felder", async () => {
    const result = await updateGameCopy("copy-1", {
      valueCents: 2499,
      acquiredOn: ACQUIRED_ON,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "copy-1" },
      data: { condition: null, valueCents: 2499, acquiredOn: ACQUIRED_ON },
      include: { boardGame: { select: { slug: true } } },
    });
  });

  it("entfernt beide Felder mit null", async () => {
    await updateGameCopy("copy-1", { valueCents: null, acquiredOn: null });

    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { condition: null, valueCents: null, acquiredOn: null },
      }),
    );
  });

  it("lässt beide Felder unverändert, wenn sie fehlen", async () => {
    await updateGameCopy("copy-1", { condition: "Neuwertig" });

    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { condition: "Neuwertig" } }),
    );
  });

  it("lehnt ein Datum in der Zukunft ab", async () => {
    const result = await updateGameCopy("copy-1", {
      acquiredOn: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

    expect(result).toEqual({
      error: "„Erhalten am“ darf nicht in der Zukunft liegen.",
    });
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });

  it("lehnt einen negativen Wert ab", async () => {
    const result = await updateGameCopy("copy-1", { valueCents: -1 });

    expect(result).toEqual({
      error: "Wert muss ein Betrag in Euro sein, z. B. 24,99.",
    });
  });
});
