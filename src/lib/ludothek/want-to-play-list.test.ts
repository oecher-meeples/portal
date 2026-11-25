import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  clearWantToPlay,
  countWantToPlay,
  listWantToPlay,
  removeWantToPlay,
  WANT_TO_PLAY_PAGE_SIZE,
} = await import("./want-to-play-list");

const row = (n: number) => ({
  id: `e${n}`,
  boardGame: {
    id: `g${n}`,
    slug: `spiel-${n}`,
    title: `Spiel ${n}`,
    imageUrl: null,
  },
});

beforeEach(() => vi.clearAllMocks());

describe("listWantToPlay (#637)", () => {
  it("lädt 25 Einträge plus einen zur Erkennung weiterer Seiten", async () => {
    prismaMock.gameWantToPlay.findMany.mockResolvedValue([] as never);

    await listWantToPlay("m1");

    expect(prismaMock.gameWantToPlay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { meepleId: "m1" },
        take: WANT_TO_PLAY_PAGE_SIZE + 1,
        orderBy: [{ boardGame: { title: "asc" } }, { id: "asc" }],
      }),
    );
  });

  it("liefert einen Cursor (Titel, Id), solange es weitere Einträge gibt", async () => {
    prismaMock.gameWantToPlay.findMany.mockResolvedValue([
      row(1),
      row(2),
      row(3),
    ] as never);

    const page = await listWantToPlay("m1", { take: 2 });

    expect(page.items.map((i) => i.boardGameId)).toEqual(["g1", "g2"]);
    expect(page.nextCursor).toEqual({ title: "Spiel 2", id: "e2" });
  });

  it("hat auf der letzten Seite keinen Cursor", async () => {
    prismaMock.gameWantToPlay.findMany.mockResolvedValue([row(1)] as never);

    expect((await listWantToPlay("m1", { take: 2 })).nextCursor).toBeNull();
  });

  it("setzt hinter dem Cursor (Titel, Id) fort", async () => {
    prismaMock.gameWantToPlay.findMany.mockResolvedValue([] as never);

    await listWantToPlay("m1", { after: { title: "Spiel 2", id: "e2" } });

    expect(prismaMock.gameWantToPlay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          meepleId: "m1",
          OR: [
            { boardGame: { title: { gt: "Spiel 2" } } },
            { boardGame: { title: "Spiel 2" }, id: { gt: "e2" } },
          ],
        },
      }),
    );
  });
});

describe("Zähler und Löschen (#637)", () => {
  it("zählt nur die Einträge des Meeples", async () => {
    prismaMock.gameWantToPlay.count.mockResolvedValue(3);
    expect(await countWantToPlay("m1")).toBe(3);
    expect(prismaMock.gameWantToPlay.count).toHaveBeenCalledWith({
      where: { meepleId: "m1" },
    });
  });

  it("entfernt einen Eintrag nur für den übergebenen Meeple", async () => {
    await removeWantToPlay("m1", "g1");
    expect(prismaMock.gameWantToPlay.deleteMany).toHaveBeenCalledWith({
      where: { meepleId: "m1", boardGameId: "g1" },
    });
  });

  it("leert nur die Liste des übergebenen Meeples", async () => {
    await clearWantToPlay("m1");
    expect(prismaMock.gameWantToPlay.deleteMany).toHaveBeenCalledWith({
      where: { meepleId: "m1" },
    });
  });
});
