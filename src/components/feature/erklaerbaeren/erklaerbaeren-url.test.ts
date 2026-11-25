import { describe, expect, it } from "vitest";
import { erklaerbaerenHref, parseErklaerbaerenTab } from "./erklaerbaeren-url";

describe("erklaerbaerenHref", () => {
  it("is the bare path for the default state", () => {
    expect(erklaerbaerenHref({})).toBe("/erklaerbaeren");
  });

  it("carries tab, filter and query", () => {
    expect(
      erklaerbaerenHref({ tab: "verzeichnis", filter: "gesucht", q: "azul" }),
    ).toBe("/erklaerbaeren?tab=verzeichnis&filter=gesucht&q=azul");
  });

  it("omits the default tab so ?filter=gesucht opens tab 1", () => {
    expect(erklaerbaerenHref({ filter: "gesucht" })).toBe(
      "/erklaerbaeren?filter=gesucht",
    );
  });
});

describe("parseErklaerbaerenTab", () => {
  it("falls back to meine", () => {
    expect(parseErklaerbaerenTab(undefined)).toBe("meine");
    expect(parseErklaerbaerenTab("x")).toBe("meine");
    expect(parseErklaerbaerenTab("verzeichnis")).toBe("verzeichnis");
  });
});
