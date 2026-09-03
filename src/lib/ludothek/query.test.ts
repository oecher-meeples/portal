import { describe, expect, it, vi } from "vitest";
import { BoardGameKind } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/explainer/queries", () => ({
  getExplainerCountsForGames: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/content/lfg", () => ({
  getBoardGameIdsWithOpenLfgPosts: vi.fn().mockResolvedValue(new Set()),
}));

import {
  buildLudothekGames,
  countBoardGameTitles,
  roundDownToHundred,
} from "./query";

const BASE_BOARD_GAME = {
  id: "bg-1",
  slug: "arche-nova",
  title: "Arche Nova",
  imageUrl: null,
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 90,
  weight: null,
  averageRating: null,
  mechanics: [],
  categories: [],
  ean: null,
  bggId: null,
  secondaryTitle: null,
  description: null,
  explainerVideoUrl: null,
  kind: BoardGameKind.BOARDGAME,
  languageDependence: null,
  publisher: [],
  author: [],
  yearPublished: null,
  baseGameCollections: [],
  expansionCollections: [],
  alternateNames: [],
};

function gameCopyWithHolding(holding: Record<string, unknown>) {
  return {
    id: "copy-1",
    slug: "arche-nova-1",
    condition: null,
    ruleBookLanguages: [],
    inventoryNumber: null,
    status: "ACTIVE",
    boardGame: BASE_BOARD_GAME,
    holdings: [holding],
  };
}

describe("buildLudothekGames", () => {
  it("sorts by averageRating descending with unrated titles last (#214)", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue([]);
    prismaMock.storageUnit.findMany.mockResolvedValue([]);

    await buildLudothekGames();

    expect(prismaMock.gameCopy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { boardGame: { averageRating: { sort: "desc", nulls: "last" } } },
          { boardGame: { title: "asc" } },
        ],
      }),
    );
  });

  // #456: unbestätigte Weitergabe (Holding.confirmedAt === null) muss bis
  // in die Detailseite/Listenzeile durchgereicht werden.
  it("marks a member holding as isUnconfirmed when confirmedAt is null", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue([
      gameCopyWithHolding({
        vereinsmitgliedId: "member-1",
        vereinsmitglied: {
          id: "member-1",
          firstName: "Erika",
          lastName: "Muster",
          email: "erika@example.com",
          meeple: {
            id: "meeple-1",
            displayName: "Erika",
            neonAuthUserId: null,
          },
        },
        confirmedAt: null,
        endedAt: null,
        origin: "HANDOVER",
      }),
    ] as never);
    prismaMock.storageUnit.findMany.mockResolvedValue([]);

    const [game] = await buildLudothekGames();

    expect(game.isUnconfirmed).toBe(true);
  });

  it("marks a member holding as confirmed once confirmedAt is set", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue([
      gameCopyWithHolding({
        vereinsmitgliedId: "member-1",
        vereinsmitglied: {
          id: "member-1",
          firstName: "Erika",
          lastName: "Muster",
          email: "erika@example.com",
          meeple: {
            id: "meeple-1",
            displayName: "Erika",
            neonAuthUserId: null,
          },
        },
        confirmedAt: new Date("2026-08-01"),
        endedAt: null,
        origin: "HANDOVER",
      }),
    ] as never);
    prismaMock.storageUnit.findMany.mockResolvedValue([]);

    const [game] = await buildLudothekGames();

    expect(game.isUnconfirmed).toBe(false);
  });

  it("is not unconfirmed when a copy has no active holding at all", async () => {
    prismaMock.gameCopy.findMany.mockResolvedValue([
      { ...gameCopyWithHolding({}), holdings: [] },
    ] as never);
    prismaMock.storageUnit.findMany.mockResolvedValue([]);

    const [game] = await buildLudothekGames();

    expect(game.isUnconfirmed).toBe(false);
  });
});

describe("countBoardGameTitles", () => {
  it("counts only base-game titles", async () => {
    prismaMock.boardGame.count.mockResolvedValue(642);

    const count = await countBoardGameTitles();

    expect(count).toBe(642);
    expect(prismaMock.boardGame.count).toHaveBeenCalledWith({
      where: { kind: BoardGameKind.BOARDGAME },
    });
  });
});

describe("roundDownToHundred", () => {
  it("rounds down to the nearest hundred", () => {
    expect(roundDownToHundred(642)).toBe(600);
  });

  it("keeps exact hundreds unchanged", () => {
    expect(roundDownToHundred(700)).toBe(700);
  });

  it("rounds down below the first hundred to zero", () => {
    expect(roundDownToHundred(42)).toBe(0);
  });
});
