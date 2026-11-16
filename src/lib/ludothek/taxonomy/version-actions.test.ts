import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import type { BggVersion } from "@/lib/bgg/client";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
const requireGamesManagePermissionMock = vi.fn();
vi.mock("@/lib/ludothek/permissions", () => ({
  requireGamesManagePermission: () => requireGamesManagePermissionMock(),
}));
const fetchBggGameMock = vi.fn();
vi.mock("@/lib/bgg/client", () => ({
  fetchBggGame: (...args: unknown[]) => fetchBggGameMock(...args),
}));

const { getUnsavedBggVersions } = await import("./version-actions");

function bggVersion(bggVersionId: number | null): BggVersion {
  return {
    bggVersionId,
    name: `Version ${bggVersionId}`,
    yearPublished: null,
    publisher: [],
    productCode: null,
    languages: ["German"],
    publisherLinks: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireGamesManagePermissionMock.mockResolvedValue({ id: "user-1" });
});

describe("getUnsavedBggVersions", () => {
  it("returns only the BGG versions that are not saved yet", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      bggId: 342942,
      versions: [{ bggVersionId: 1 }],
    } as never);
    fetchBggGameMock.mockResolvedValue({
      versions: [bggVersion(1), bggVersion(2), bggVersion(null)],
    });

    const result = await getUnsavedBggVersions("game-1");

    expect(fetchBggGameMock).toHaveBeenCalledWith(342942);
    expect(result.map((v) => v.bggVersionId)).toEqual([2, null]);
  });

  it("returns nothing for a title without BGG id", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      bggId: null,
      versions: [],
    } as never);

    expect(await getUnsavedBggVersions("game-1")).toEqual([]);
    expect(fetchBggGameMock).not.toHaveBeenCalled();
  });

  it("returns nothing when BGG fails", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      bggId: 342942,
      versions: [],
    } as never);
    fetchBggGameMock.mockRejectedValue(new Error("BGG down"));

    expect(await getUnsavedBggVersions("game-1")).toEqual([]);
  });

  it("returns nothing without games:manage", async () => {
    requireGamesManagePermissionMock.mockResolvedValue(null);

    expect(await getUnsavedBggVersions("game-1")).toEqual([]);
    expect(prismaMock.boardGame.findUnique).not.toHaveBeenCalled();
  });
});
