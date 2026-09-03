import { describe, expect, it } from "vitest";
import { getStorageTone } from "./storage-tone";

describe("getStorageTone", () => {
  it("is ok below 75%", () => {
    expect(getStorageTone(0)).toBe("ok");
    expect(getStorageTone(74.9)).toBe("ok");
  });

  it("is warning from 75% up to (excluding) 90%", () => {
    expect(getStorageTone(75)).toBe("warning");
    expect(getStorageTone(89.9)).toBe("warning");
  });

  it("is critical from 90% and above", () => {
    expect(getStorageTone(90)).toBe("critical");
    expect(getStorageTone(120)).toBe("critical");
  });
});
