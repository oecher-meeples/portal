import { describe, expect, it } from "vitest";
import {
  buildShortIdUrl,
  classifyScannedSearch,
  formatShortIdSlug,
  parseShortId,
  shortIdFromUnitCode,
  unitCodeFromShortId,
  unitKindFromShortId,
} from "./short-id";

describe("classifyScannedSearch (#570)", () => {
  it.each([
    ["https://192.168.178.100:3002/id/inv-189", "/id/inv-189"],
    ["https://short.oecher-meeples.org/id/box-0001", "/id/box-0001"],
    ["https://short.oecher-meeples.org/id/shelf-c4", "/id/shelf-C4"],
    ["inv-42", "/id/inv-42"],
  ])("routes the short ID %s via the router", (raw, href) => {
    expect(classifyScannedSearch(raw)).toEqual({ kind: "navigate", href });
  });

  it("marks meeple codes as not yet supported (#541)", () => {
    expect(
      classifyScannedSearch("https://short.oecher-meeples.org/id/meeple-abc"),
    ).toEqual({ kind: "unsupported", shortId: { kind: "meeple", id: "abc" } });
  });

  it.each(["4001504311892", "Ark Nova", "https://example.org/spiele/123"])(
    "keeps %s as search text",
    (raw) => {
      expect(classifyScannedSearch(raw)).toEqual({ kind: "search", text: raw });
    },
  );
});

describe("buildShortIdUrl", () => {
  it("builds the fixed public short URL", () => {
    expect(buildShortIdUrl({ kind: "inv", id: 123 })).toBe(
      "https://short.oecher-meeples.org/id/inv-123",
    );
    expect(buildShortIdUrl({ kind: "box", id: "0001" })).toBe(
      "https://short.oecher-meeples.org/id/box-0001",
    );
  });
});

describe("formatShortIdSlug", () => {
  it("joins prefix and id with a dash", () => {
    expect(formatShortIdSlug({ kind: "shelf", id: "0007" })).toBe("shelf-0007");
  });
});

describe("parseShortId", () => {
  it.each([
    "inv-123",
    "https://short.oecher-meeples.org/id/inv-123",
    "http://localhost:3002/id/inv-123",
    "https://portal.example/id/inv-123?utm=x#top",
    "https://short.oecher-meeples.org/id/inv-123/",
    "  INV-123  ",
  ])("parses %s as inventory number 123", (raw) => {
    expect(parseShortId(raw)).toEqual({ kind: "inv", id: 123 });
  });

  it("parses unit slugs and keeps leading zeros", () => {
    expect(parseShortId("box-0001")).toEqual({ kind: "box", id: "0001" });
    expect(parseShortId("https://x.example/id/shelf-0012")).toEqual({
      kind: "shelf",
      id: "0012",
    });
  });

  it("accepts free alphanumeric unit codes, normalised to upper case", () => {
    expect(parseShortId("shelf-c4")).toEqual({ kind: "shelf", id: "C4" });
    expect(parseShortId("BOX-a1")).toEqual({ kind: "box", id: "A1" });
  });

  it("parses meeple slugs", () => {
    expect(parseShortId("meeple-cm1abc_2-x")).toEqual({
      kind: "meeple",
      id: "cm1abc_2-x",
    });
  });

  it.each([
    "",
    "inv-abc",
    "inv-0",
    "inv-1.5",
    "inv-",
    "xyz-1",
    "box-A-1",
    "meeple-a b",
    "OM-BOX-0001",
    "https://short.oecher-meeples.org/inv-123",
    "https://short.oecher-meeples.org/id/",
    "4006381333931",
  ])("rejects %s", (raw) => {
    expect(parseShortId(raw)).toBeNull();
  });
});

describe("unit code mapping", () => {
  it("maps a unit short id to its stored code", () => {
    expect(unitCodeFromShortId({ kind: "box", id: "0001" })).toBe(
      "OM-BOX-0001",
    );
    expect(unitCodeFromShortId({ kind: "shelf", id: "0012" })).toBe(
      "OM-SHELF-0012",
    );
  });

  it("maps a stored code back to its short id", () => {
    expect(shortIdFromUnitCode("OM-BOX-0001")).toEqual({
      kind: "box",
      id: "0001",
    });
    expect(shortIdFromUnitCode("om-shelf-0012")).toEqual({
      kind: "shelf",
      id: "0012",
    });
  });

  it("maps free alphanumeric codes", () => {
    expect(shortIdFromUnitCode("OM-SHELF-C4")).toEqual({
      kind: "shelf",
      id: "C4",
    });
  });

  it("returns null for codes without a short id", () => {
    expect(shortIdFromUnitCode("OM-EVENT-sommerfest")).toBeNull();
    expect(shortIdFromUnitCode("Regal links")).toBeNull();
  });

  it("round-trips", () => {
    const shortId = shortIdFromUnitCode("OM-SHELF-0003");
    expect(shortId && unitCodeFromShortId(shortId)).toBe("OM-SHELF-0003");
  });

  it("maps the prefix to the storage unit kind", () => {
    expect(unitKindFromShortId({ kind: "box", id: "1" })).toBe("BOX");
    expect(unitKindFromShortId({ kind: "shelf", id: "1" })).toBe("SHELF");
  });
});
