import { describe, expect, it } from "vitest";
import {
  helperDisplayName,
  helperKey,
  helperRefData,
  isGuest,
} from "./helper-identity";

describe("helper identity", () => {
  it("prefers meepleId over guestId", () => {
    const both = { meepleId: "m1", guestId: "g1" };
    expect(helperKey(both)).toBe("m1");
    expect(isGuest(both)).toBe(false);
    expect(helperDisplayName(both, "Max")).toBe("Max");
  });

  it("falls back to the guest and suffixes the name", () => {
    const guest = { meepleId: null, guestId: "g1" };
    expect(helperKey(guest)).toBe("g1");
    expect(isGuest(guest)).toBe(true);
    expect(helperDisplayName(guest, "Max")).toBe("Max (Gast)");
  });

  it("throws without any id", () => {
    expect(() => helperKey({})).toThrow();
  });

  it("builds the prisma ref", () => {
    expect(helperRefData("x", true)).toEqual({ guestId: "x" });
    expect(helperRefData("x", false)).toEqual({ meepleId: "x" });
  });
});
