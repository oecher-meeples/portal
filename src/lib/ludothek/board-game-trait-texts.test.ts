import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardGameTrait, BoardGameTraitTone } from "@prisma/client";

const findManyMock = vi.fn();
const upsertMock = vi.fn();
vi.mock("@/lib/utils/prisma", () => ({
  prisma: {
    boardGameTraitText: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
    },
  },
}));

const {
  listBoardGameTraitTexts,
  loadBoardGameTraitTextsByTrait,
  updateBoardGameTraitText,
} = await import("./board-game-trait-texts");

beforeEach(() => {
  findManyMock.mockReset();
  upsertMock.mockReset().mockResolvedValue({});
});

describe("listBoardGameTraitTexts", () => {
  it("returns a row for every trait, even when the DB only has some of them", async () => {
    findManyMock.mockResolvedValue([
      {
        trait: BoardGameTrait.LEGACY,
        label: "Legacy",
        tooltip: null,
        tone: BoardGameTraitTone.WARNING,
        loanMessage: "Achtung.",
        detailsMessage: null,
      },
    ]);

    const rows = await listBoardGameTraitTexts();

    expect(rows).toHaveLength(Object.values(BoardGameTrait).length);
    expect(rows.find((r) => r.trait === BoardGameTrait.LEGACY)?.label).toBe(
      "Legacy",
    );
    expect(rows.find((r) => r.trait === BoardGameTrait.CAMPAIGN)?.tone).toBe(
      BoardGameTraitTone.INFO,
    );
  });
});

describe("loadBoardGameTraitTextsByTrait", () => {
  it("returns a plain object keyed by trait, not a Map", async () => {
    findManyMock.mockResolvedValue([
      {
        trait: BoardGameTrait.LEGACY,
        label: "Legacy",
        tooltip: null,
        tone: BoardGameTraitTone.WARNING,
        loanMessage: null,
        detailsMessage: null,
      },
    ]);

    const byTrait = await loadBoardGameTraitTextsByTrait();

    expect(byTrait).not.toBeInstanceOf(Map);
    expect(byTrait[BoardGameTrait.LEGACY]?.label).toBe("Legacy");
  });
});

describe("updateBoardGameTraitText", () => {
  it("upserts the row", async () => {
    const result = await updateBoardGameTraitText(BoardGameTrait.LEGACY, {
      label: "Legacy",
      tooltip: null,
      tone: BoardGameTraitTone.WARNING,
      loanMessage: "Achtung.",
      detailsMessage: null,
    });

    expect(result).toEqual({ success: true });
    expect(upsertMock).toHaveBeenCalledWith({
      where: { trait: BoardGameTrait.LEGACY },
      update: {
        label: "Legacy",
        tooltip: null,
        tone: BoardGameTraitTone.WARNING,
        loanMessage: "Achtung.",
        detailsMessage: null,
      },
      create: {
        trait: BoardGameTrait.LEGACY,
        label: "Legacy",
        tooltip: null,
        tone: BoardGameTraitTone.WARNING,
        loanMessage: "Achtung.",
        detailsMessage: null,
      },
    });
  });
});
