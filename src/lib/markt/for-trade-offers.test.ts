import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { findForTradeOffers } = await import("./for-trade-offers");

function row(id: string, title: string, owner: string) {
  return {
    id,
    boardGame: { slug: title.toLowerCase(), title, imageUrl: null },
    meeple: {
      id: `m-${owner}`,
      displayName: owner,
      profilePictureUrl: null,
      profilePictureVisibility: "INTERN",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([]);
});

describe("findForTradeOffers (#632-Folge)", () => {
  it("only lists for-trade entries of opted-in, non-anonymised meeples", async () => {
    await findForTradeOffers();

    expect(prismaMock.privateGameCollectionEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          forTrade: true,
          meeple: { shareForTrade: true, anonymizedAt: null },
        },
      }),
    );
  });

  it("filters by title case-insensitively when searching", async () => {
    await findForTradeOffers("  catan ");

    expect(prismaMock.privateGameCollectionEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          boardGame: { title: { contains: "catan", mode: "insensitive" } },
        }),
      }),
    );
  });

  it("groups owners per title, sorted by title and owner name", async () => {
    prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([
      row("3", "Catan", "Zoe"),
      row("1", "Agricola", "Ben"),
      row("2", "Catan", "Anna"),
    ] as never);

    const result = await findForTradeOffers();

    expect(result.map((g) => g.title)).toEqual(["Agricola", "Catan"]);
    expect(result[1].owners.map((o) => o.name)).toEqual(["Anna", "Zoe"]);
    expect(result[1].owners[0]).toMatchObject({ meepleId: "m-Anna" });
  });
});
