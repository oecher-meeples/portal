import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getExplainerDirectory } =
  await import("@/lib/explainer/directory-queries");
const { parseDirectoryFilter } = await import("@/lib/explainer/game-list");

describe("parseDirectoryFilter", () => {
  it("defaults to all", () => {
    expect(parseDirectoryFilter(undefined)).toBe("all");
    expect(parseDirectoryFilter("gesucht")).toBe("wanted");
  });
});

describe("getExplainerDirectory", () => {
  it("all: only games with at least one explainer, sorted by title", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([] as never);

    await getExplainerDirectory({ filter: "all" });

    expect(prismaMock.boardGame.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { explainerGames: { some: {} } },
        orderBy: { title: "asc" },
      }),
    );
  });

  it("wanted: flagged games, also without explainers, filtered by title", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([] as never);

    await getExplainerDirectory({ filter: "wanted", query: " azu " });

    expect(prismaMock.boardGame.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          explainerWanted: true,
          title: { contains: "azu", mode: "insensitive" },
        },
      }),
    );
  });

  it("flattens explainers per game", async () => {
    prismaMock.boardGame.findMany.mockResolvedValue([
      {
        id: "g",
        title: "Azul",
        imageUrl: "u",
        slug: "azul",
        explainerWanted: true,
        explainerGames: [
          {
            level: "BY_HEART",
            meeple: {
              id: "m",
              displayName: "Lea",
              profilePictureUrl: null,
              profilePictureVisibility: "MEMBERS",
            },
          },
        ],
      },
      {
        id: "h",
        title: "Brass",
        imageUrl: null,
        slug: "brass",
        explainerWanted: true,
        explainerGames: [],
      },
    ] as never);

    const result = await getExplainerDirectory({ filter: "wanted" });

    expect(result[0]).toEqual({
      boardGameId: "g",
      boardGameTitle: "Azul",
      imageUrl: "u",
      slug: "azul",
      wanted: true,
      explainers: [
        {
          meepleId: "m",
          displayName: "Lea",
          level: "BY_HEART",
          profilePictureUrl: null,
          profilePictureVisibility: "MEMBERS",
        },
      ],
    });
    expect(result[1].explainers).toEqual([]);
  });
});
