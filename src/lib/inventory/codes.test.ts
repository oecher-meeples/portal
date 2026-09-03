import { describe, expect, it } from "vitest";
import { buildMeepleCode, nextUnitCode, parseScannedCode } from "./codes";

describe("nextUnitCode", () => {
  it("starts at 0001 for boxes", () => {
    expect(nextUnitCode("BOX", [])).toBe("OM-BOX-0001");
  });

  it("continues counting up for shelves with a different prefix", () => {
    expect(nextUnitCode("SHELF", ["OM-SHELF-0001", "OM-SHELF-0002"])).toBe(
      "OM-SHELF-0003",
    );
  });

  it("only counts codes of the requested kind", () => {
    expect(nextUnitCode("BOX", ["OM-SHELF-0001", "OM-SHELF-0002"])).toBe(
      "OM-BOX-0001",
    );
  });

  it("fills a gap left by a retired unit instead of only appending", () => {
    expect(
      nextUnitCode("BOX", ["OM-BOX-0001", "OM-BOX-0003", "OM-BOX-0004"]),
    ).toBe("OM-BOX-0002");
  });

  it("ignores the fixed OM-BOX-0000 code for Unsortiert", () => {
    expect(nextUnitCode("BOX", ["OM-BOX-0000"])).toBe("OM-BOX-0001");
  });
});

describe("parseScannedCode", () => {
  it("recognises a box code", () => {
    expect(parseScannedCode("OM-BOX-0001")).toEqual({
      kind: "unit",
      value: "OM-BOX-0001",
    });
  });

  it("recognises a shelf code case-insensitively", () => {
    expect(parseScannedCode("om-shelf-c4".toUpperCase())).toEqual({
      kind: "unit",
      value: "OM-SHELF-C4",
    });
  });

  it("recognises a valid ean-13", () => {
    expect(parseScannedCode("5901234123457")).toEqual({
      kind: "ean",
      value: "5901234123457",
    });
  });

  it("recognises a valid ean-8", () => {
    expect(parseScannedCode("40170725")).toEqual({
      kind: "ean",
      value: "40170725",
    });
  });

  it("treats nonsense as unknown", () => {
    expect(parseScannedCode("hallo welt")).toEqual({
      kind: "unknown",
      value: "hallo welt",
    });
  });

  it("treats the wrong digit count as unknown, not an ean", () => {
    expect(parseScannedCode("12345")).toEqual({
      kind: "unknown",
      value: "12345",
    });
  });

  // #465: Meeple-QR-Code — statisch an die Meeple-Id gebunden.
  it("recognises a Meeple's personal QR code", () => {
    expect(parseScannedCode("OM-MEEPLE-clx8f0000000abcdef")).toEqual({
      kind: "meeple",
      value: "clx8f0000000abcdef",
    });
  });
});

describe("buildMeepleCode (#465)", () => {
  it("builds the QR content for a Meeple's personal code", () => {
    expect(buildMeepleCode("clx8f0000000abcdef")).toBe(
      "OM-MEEPLE-clx8f0000000abcdef",
    );
  });

  it("round-trips through parseScannedCode", () => {
    const meepleId = "clx8f0000000abcdef";
    expect(parseScannedCode(buildMeepleCode(meepleId))).toEqual({
      kind: "meeple",
      value: meepleId,
    });
  });
});
