import { describe, expect, it } from "vitest";
import { truncateText } from "./truncate";

describe("truncateText", () => {
  it("returns the text unchanged when it already fits", () => {
    expect(truncateText("Kurzer Text.", 200)).toBe("Kurzer Text.");
  });

  it("returns the text unchanged when it is exactly maxLength", () => {
    const text = "x".repeat(200);
    expect(truncateText(text, 200)).toBe(text);
  });

  it("cuts at the last space before the limit and appends an ellipsis", () => {
    const text = "Ein langer Beschreibungstext, der über die Grenze hinausgeht";
    const result = truncateText(text, 20);

    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(21);
    expect(result).not.toMatch(/\s…$/);
  });

  it("does not cut a word in half", () => {
    const text = "Wortreiches Kompositum ohne Leerzeichen dazwischen";
    const result = truncateText(text, 15);

    expect(result).toBe("Wortreiches…");
  });

  it("falls back to a hard cut when there is no earlier space", () => {
    const text = "Einzelwortohnejeglicheleerzeichenimtext";
    const result = truncateText(text, 10);

    expect(result).toBe("Einzelwort…");
  });
});
