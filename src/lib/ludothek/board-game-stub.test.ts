import { describe, expect, it } from "vitest";
import { isCatalogStub } from "./board-game-stub";

const base = { description: null, minPlayers: null, maxPlayers: null };

describe("isCatalogStub", () => {
  it("erkennt Titel ohne Beschreibung und Spielerzahl", () => {
    expect(isCatalogStub(base)).toBe(true);
  });
  it("Beschreibung oder Spielerzahl machen einen Titel vollständig", () => {
    expect(isCatalogStub({ ...base, description: "Text" })).toBe(false);
    expect(isCatalogStub({ ...base, minPlayers: 2 })).toBe(false);
    expect(isCatalogStub({ ...base, maxPlayers: 4 })).toBe(false);
  });
});
