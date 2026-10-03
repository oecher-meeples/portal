import { describe, expect, it } from "vitest";
import { BoardGameTrait, BoardGameTraitTone } from "@prisma/client";
import {
  BOARD_GAME_TRAIT_FALLBACK_LABELS,
  resolveBoardGameTraits,
} from "@/lib/ludothek/board-game-traits";

describe("resolveBoardGameTraits", () => {
  it("merges the code config (variant) with the DB text (label/tone)", () => {
    const [resolved] = resolveBoardGameTraits([BoardGameTrait.LEGACY], {
      [BoardGameTrait.LEGACY]: {
        trait: BoardGameTrait.LEGACY,
        label: "Legacy",
        tooltip: null,
        tone: BoardGameTraitTone.WARNING,
        loanMessage: "Achtung Legacy.",
        detailsMessage: null,
      },
    });

    expect(resolved.variant).toBe("pill");
    expect(resolved.label).toBe("Legacy");
    expect(resolved.tone).toBe(BoardGameTraitTone.WARNING);
    expect(resolved.loanMessage).toBe("Achtung Legacy.");
  });

  it("resolves DIGITAL_HYBRID to the icon variant with an icon component", () => {
    const [resolved] = resolveBoardGameTraits(
      [BoardGameTrait.DIGITAL_HYBRID],
      {},
    );

    expect(resolved.variant).toBe("icon");
    expect(resolved.icon).toBeDefined();
  });

  it("falls back to the fixed label and INFO tone when no text row exists", () => {
    const [resolved] = resolveBoardGameTraits([BoardGameTrait.CAMPAIGN], {});

    expect(resolved.label).toBe(
      BOARD_GAME_TRAIT_FALLBACK_LABELS[BoardGameTrait.CAMPAIGN],
    );
    expect(resolved.tone).toBe(BoardGameTraitTone.INFO);
    expect(resolved.loanMessage).toBeNull();
  });

  it("falls back to the fixed label when the DB label is empty", () => {
    const [resolved] = resolveBoardGameTraits([BoardGameTrait.LEGACY], {
      [BoardGameTrait.LEGACY]: {
        trait: BoardGameTrait.LEGACY,
        label: "",
        tooltip: null,
        tone: BoardGameTraitTone.INFO,
        loanMessage: null,
        detailsMessage: null,
      },
    });

    expect(resolved.label).toBe(
      BOARD_GAME_TRAIT_FALLBACK_LABELS[BoardGameTrait.LEGACY],
    );
  });

  it("returns an empty array for no traits", () => {
    expect(resolveBoardGameTraits([], {})).toEqual([]);
  });
});
