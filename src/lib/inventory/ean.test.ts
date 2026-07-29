import { describe, expect, it } from "vitest";
import { isValidEan, normaliseEan } from "./ean";

describe("normaliseEan", () => {
  it("strips spaces and dashes", () => {
    expect(normaliseEan("590-1234 123457")).toBe("5901234123457");
  });
});

describe("isValidEan", () => {
  it("accepts a valid ean-13", () => {
    expect(isValidEan("5901234123457")).toBe(true);
  });

  it("accepts a valid ean-13 with separators", () => {
    expect(isValidEan("590-1234-123457")).toBe(true);
  });

  it("accepts a valid ean-8", () => {
    expect(isValidEan("40170725")).toBe(true);
  });

  it("rejects a wrong checksum", () => {
    expect(isValidEan("5901234123456")).toBe(false);
    expect(isValidEan("40170726")).toBe(false);
  });

  it("rejects the wrong digit count", () => {
    expect(isValidEan("123456")).toBe(false);
    expect(isValidEan("12345678901")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(isValidEan("hallo welt")).toBe(false);
    expect(isValidEan("")).toBe(false);
  });
});
