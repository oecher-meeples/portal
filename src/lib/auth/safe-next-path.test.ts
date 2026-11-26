import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-next-path";

describe("safeInternalPath", () => {
  it("lässt interne Pfade durch", () => {
    expect(safeInternalPath("/login?next=/admin")).toBe("/login?next=/admin");
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "evil.example",
    "/a\nb",
  ])("fällt bei %j auf den Fallback zurück", (value) => {
    expect(safeInternalPath(value)).toBe("/login");
  });
});
