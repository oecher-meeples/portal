import { describe, expect, it } from "vitest";
import {
  translateMechanic,
  translateMechanics,
} from "./mechanics-translations";

describe("translateMechanic", () => {
  it("translates a known BGG mechanic into German", () => {
    expect(translateMechanic("Worker Placement")).toBe("Arbeitereinsatz");
  });

  it("falls back to the original term for an unknown mechanic", () => {
    expect(translateMechanic("Some Unmapped Mechanic")).toBe(
      "Some Unmapped Mechanic",
    );
  });

  it("keeps established anglicisms as-is (no entry needed, fallback already correct)", () => {
    expect(translateMechanic("Deck, Bag, and Pool Building")).toBe(
      "Deck, Bag, and Pool Building",
    );
  });
});

describe("translateMechanics", () => {
  it("translates each mechanic in the list independently", () => {
    expect(
      translateMechanics(["Worker Placement", "Dice Rolling", "Unknown"]),
    ).toEqual(["Arbeitereinsatz", "Würfelglück", "Unknown"]);
  });

  it("returns an empty array unchanged", () => {
    expect(translateMechanics([])).toEqual([]);
  });
});
