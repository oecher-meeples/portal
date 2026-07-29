import { describe, expect, it } from "vitest";
import { parseBggId } from "./bgg-id";

describe("parseBggId", () => {
  it("parses a valid numeric id", () => {
    expect(parseBggId("342942")).toBe(342942);
  });

  it("trims surrounding whitespace", () => {
    expect(parseBggId("  1  ")).toBe(1);
  });

  it("rejects an empty string", () => {
    expect(parseBggId("")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseBggId("abc")).toBeNull();
  });

  it("rejects decimals", () => {
    expect(parseBggId("3.5")).toBeNull();
  });

  it("rejects negative numbers", () => {
    expect(parseBggId("-5")).toBeNull();
  });

  it("rejects zero", () => {
    expect(parseBggId("0")).toBeNull();
  });
});
