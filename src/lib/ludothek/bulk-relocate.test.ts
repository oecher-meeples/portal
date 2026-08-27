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
vi.mock("@/lib/ludothek/holdings", () => ({
  relocateGame: (...args: unknown[]) => relocateGameMock(...args),
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
  });

  it("relocates the copy to the target unit, recorded by the acting meeple", async () => {
    relocateGameMock.mockResolvedValue({});

    const result = await bulkRelocateGameCopy("copy-1", "unit-1");

    expect(relocateGameMock).toHaveBeenCalledWith({
      gameCopyId: "copy-1",
      toUnitId: "unit-1",
      recordedByMeepleId: "meeple-1",
    });
    expect(result).toEqual({ success: true });
  });

  it("surfaces the domain error message instead of throwing (e.g. copy currently loaned out)", async () => {
    relocateGameMock.mockRejectedValue(
      new Error(
        "Umlagern gilt nur für Spiele, die bereits in einer Einheit liegen — dieses ist ausgeliehen.",
      ),
    );

    const result = await bulkRelocateGameCopy("copy-1", "unit-1");

    expect(result).toEqual({
      error:
        "Umlagern gilt nur für Spiele, die bereits in einer Einheit liegen — dieses ist ausgeliehen.",
    });
  });
});
