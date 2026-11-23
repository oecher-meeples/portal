import { describe, expect, it } from "vitest";
import { isEventVisible } from "./visibility";

describe("isEventVisible", () => {
  it("DRAFT is only visible to events:manage, regardless of tier", () => {
    expect(
      isEventVisible("DRAFT", { tier: "admin", canManageEvents: false }),
    ).toBe(false);
    expect(
      isEventVisible("DRAFT", { tier: "gast", canManageEvents: true }),
    ).toBe(true);
  });

  it("INTERNAL is visible to logged-in Meeples and admins, not guests", () => {
    expect(
      isEventVisible("INTERNAL", { tier: "gast", canManageEvents: false }),
    ).toBe(false);
    expect(
      isEventVisible("INTERNAL", {
        tier: "mitglied",
        canManageEvents: false,
      }),
    ).toBe(true);
    expect(
      isEventVisible("INTERNAL", { tier: "admin", canManageEvents: false }),
    ).toBe(true);
  });

  it("PUBLIC is visible to everyone, including guests", () => {
    expect(
      isEventVisible("PUBLIC", { tier: "gast", canManageEvents: false }),
    ).toBe(true);
  });

  it("canManageEvents always wins, even for DRAFT", () => {
    expect(
      isEventVisible("DRAFT", { tier: "gast", canManageEvents: true }),
    ).toBe(true);
  });
});
