import { describe, expect, it } from "vitest";
import { editionFlagCountry } from "./edition-language";

describe("editionFlagCountry", () => {
  it("returns null for German editions", () => {
    expect(editionFlagCountry(["German"])).toBeNull();
    expect(editionFlagCountry(["English", "German"])).toBeNull();
  });

  it("returns null when the edition language is unknown or has no flag", () => {
    expect(editionFlagCountry([])).toBeNull();
    expect(editionFlagCountry(["Klingon"])).toBeNull();
  });

  it("maps a foreign edition to its country, case-insensitively", () => {
    expect(editionFlagCountry(["English"])).toBe("GB");
    expect(editionFlagCountry(["french"])).toBe("FR");
  });

  it("uses the first language that has a flag", () => {
    expect(editionFlagCountry(["Latin", "Dutch"])).toBe("NL");
  });
});
