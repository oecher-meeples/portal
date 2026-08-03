import { describe, expect, it } from "vitest";
import {
  toSparePartListingData,
  validateSparePartListingInput,
  type SparePartListingInput,
} from "@/lib/inventory/spare-part-listings";

function input(overrides: Partial<SparePartListingInput> = {}) {
  return {
    title: "Ersatzteile Catan",
    condition: "Gebraucht, vollständig",
    keeperMeepleId: "meeple-1",
    ...overrides,
  };
}

describe("validateSparePartListingInput", () => {
  it("accepts a fully filled-in input", () => {
    expect(validateSparePartListingInput(input())).toBeNull();
  });

  it("rejects a missing title", () => {
    expect(validateSparePartListingInput(input({ title: "" }))).toBe(
      "Bitte einen Titel angeben.",
    );
  });

  it("rejects a title of only whitespace", () => {
    expect(validateSparePartListingInput(input({ title: "   " }))).toBe(
      "Bitte einen Titel angeben.",
    );
  });

  it("rejects a missing condition", () => {
    expect(validateSparePartListingInput(input({ condition: "" }))).toBe(
      "Bitte einen Zustand angeben.",
    );
  });

  it("rejects a missing keeper", () => {
    expect(validateSparePartListingInput(input({ keeperMeepleId: "" }))).toBe(
      "Bitte eine:n Verwahrer:in angeben.",
    );
  });
});

describe("toSparePartListingData", () => {
  it("trims title and condition", () => {
    const data = toSparePartListingData(
      input({ title: "  Ersatzteile Catan  ", condition: "  Gebraucht  " }),
    );

    expect(data.title).toBe("Ersatzteile Catan");
    expect(data.condition).toBe("Gebraucht");
  });

  it("defaults a missing boardGameId to null — 'Allgemeines', not tied to a game", () => {
    expect(toSparePartListingData(input()).boardGameId).toBeNull();
  });

  it("passes a given boardGameId through", () => {
    expect(
      toSparePartListingData(input({ boardGameId: "game-1" })).boardGameId,
    ).toBe("game-1");
  });

  it("trims a description, or defaults a blank one to null", () => {
    expect(
      toSparePartListingData(input({ description: "  ein Sackerl Teile  " }))
        .description,
    ).toBe("ein Sackerl Teile");
    expect(
      toSparePartListingData(input({ description: "   " })).description,
    ).toBeNull();
    expect(toSparePartListingData(input()).description).toBeNull();
  });
});
