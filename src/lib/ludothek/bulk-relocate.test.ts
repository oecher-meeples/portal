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

const relocateGameMock = vi.fn();
const returnGameMock = vi.fn();
vi.mock("@/lib/ludothek/holdings", () => ({
  relocateGame: (...args: unknown[]) => relocateGameMock(...args),
  returnGame: (...args: unknown[]) => returnGameMock(...args),
}));

const { bulkRelocateGameCopy } = await import("./bulk-relocate");

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.rolePermission.count.mockResolvedValue(1);
  ensureMeepleMock.mockResolvedValue({ id: "meeple-1" });
});

describe("bulkRelocateGameCopy (#273 Sammel-Umlagern)", () => {
  it("rejects without games:manage", async () => {
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await bulkRelocateGameCopy("copy-1", "unit-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(relocateGameMock).not.toHaveBeenCalled();
    expect(returnGameMock).not.toHaveBeenCalled();
  });

  it("rejects a copy with no open holding", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue(null);

    const result = await bulkRelocateGameCopy("copy-1", "unit-1");

    expect(result).toEqual({
      error: "Exemplar copy-1 hat keinen offenen Aufenthalt.",
    });
  });

  it("relocates a copy already in a unit, recorded by the acting meeple", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      unitId: "old-unit",
    } as never);
    relocateGameMock.mockResolvedValue({});

    const result = await bulkRelocateGameCopy("copy-1", "unit-1");

    expect(relocateGameMock).toHaveBeenCalledWith({
      gameCopyId: "copy-1",
      toUnitId: "unit-1",
      recordedByMeepleId: "meeple-1",
    });
    expect(returnGameMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("accepts a copy currently with a person, via returnGame", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      unitId: null,
      meepleId: "meeple-2",
    } as never);
    returnGameMock.mockResolvedValue({});

    const result = await bulkRelocateGameCopy("copy-1", "unit-1");

    expect(returnGameMock).toHaveBeenCalledWith({
      gameCopyId: "copy-1",
      toUnitId: "unit-1",
      recordedByMeepleId: "meeple-1",
    });
    expect(relocateGameMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("surfaces the domain error message instead of throwing", async () => {
    prismaMock.gameHolding.findFirst.mockResolvedValue({
      unitId: "old-unit",
    } as never);
    relocateGameMock.mockRejectedValue(
      new Error("Ziel-Einheit wurde nicht gefunden."),
    );

    const result = await bulkRelocateGameCopy("copy-1", "unit-1");

    expect(result).toEqual({ error: "Ziel-Einheit wurde nicht gefunden." });
  });
});
