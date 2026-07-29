import { describe, expect, it } from "vitest";
import { nextFleaMarketItemCode } from "./codes";

describe("nextFleaMarketItemCode", () => {
  it("starts at FM-0001 for an empty list", () => {
    expect(nextFleaMarketItemCode([])).toBe("FM-0001");
  });

  it("continues after the highest existing number", () => {
    expect(nextFleaMarketItemCode(["FM-0001", "FM-0002"])).toBe("FM-0003");
  });

  it("fills a gap left by a deleted item instead of only appending", () => {
    expect(nextFleaMarketItemCode(["FM-0001", "FM-0003"])).toBe("FM-0002");
  });

  it("ignores unrelated codes", () => {
    expect(nextFleaMarketItemCode(["OM-BOX-0001", "FM-0001"])).toBe("FM-0002");
  });
});
