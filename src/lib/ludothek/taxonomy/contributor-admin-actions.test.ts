import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/ludothek/permissions", () => ({
  requireGamesManagePermission: vi.fn(async () => ({ id: "user-1" })),
}));

const { deleteContributor, mergeContributors, renameContributor } =
  await import("./contributor-admin-actions");

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(((
    fn: (tx: typeof prismaMock) => unknown,
  ) => fn(prismaMock)) as never);
});

describe("renameContributor", () => {
  it("rejects a name that already exists under the same key", async () => {
    prismaMock.contributor.findUnique
      .mockResolvedValueOnce({ id: "c1", bggId: null, name: "kosmos" } as never)
      .mockResolvedValueOnce({
        id: "c2",
        bggId: null,
        name: "Kosmos",
      } as never);

    const result = await renameContributor("c1", "Kosmos");

    expect(result).toEqual({
      error: expect.stringContaining("existiert bereits"),
    });
    expect(prismaMock.contributor.update).not.toHaveBeenCalled();
  });

  it("updates name, normalized name and key", async () => {
    prismaMock.contributor.findUnique
      .mockResolvedValueOnce({ id: "c1", bggId: null, name: "kosmos" } as never)
      .mockResolvedValueOnce(null);

    const result = await renameContributor("c1", "  Kosmos ");

    expect(result).toEqual({ success: true });
    expect(prismaMock.contributor.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        name: "Kosmos",
        normalizedName: "kosmos",
        dedupKey: "name:kosmos",
      },
    });
  });
});

describe("mergeContributors", () => {
  it("refuses to merge two entries that both have a BGG id", async () => {
    prismaMock.contributor.findUnique
      .mockResolvedValueOnce({ id: "a", bggId: 1, boardGames: [] } as never)
      .mockResolvedValueOnce({ id: "b", bggId: 2 } as never);

    const result = await mergeContributors("a", "b");

    expect(result).toEqual({ error: expect.stringContaining("höchstens") });
    expect(prismaMock.contributor.delete).not.toHaveBeenCalled();
  });

  it("moves links to the entry with a BGG id and deletes the other", async () => {
    prismaMock.contributor.findUnique
      .mockResolvedValueOnce({
        id: "named",
        bggId: null,
        boardGames: [],
      } as never)
      .mockResolvedValueOnce({ id: "bgg", bggId: 7 } as never);
    prismaMock.boardGameContributor.findMany.mockResolvedValueOnce([
      { boardGameId: "g1", contributorId: "named", role: "PUBLISHER" },
    ] as never);

    const result = await mergeContributors("named", "bgg");

    expect(result).toEqual({ success: true });
    expect(prismaMock.boardGameContributor.createMany).toHaveBeenCalledWith({
      data: [{ boardGameId: "g1", contributorId: "bgg", role: "PUBLISHER" }],
      skipDuplicates: true,
    });
    expect(prismaMock.contributor.delete).toHaveBeenCalledWith({
      where: { id: "named" },
    });
  });
});

describe("deleteContributor", () => {
  it("refuses while the entry is still linked to titles", async () => {
    prismaMock.boardGameContributor.count.mockResolvedValueOnce(2);

    const result = await deleteContributor("c1");

    expect(result).toEqual({ error: expect.stringContaining("verknüpft") });
    expect(prismaMock.contributor.delete).not.toHaveBeenCalled();
  });
});
