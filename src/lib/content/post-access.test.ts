import { describe, expect, it } from "vitest";
import { canManagePostType } from "@/lib/content/post-access";

describe("canManagePostType", () => {
  it("requires posts:internal for an internal post", () => {
    expect(
      canManagePostType(
        { canEditPublic: false, canEditInternal: true },
        true,
      ),
    ).toBe(true);
    expect(
      canManagePostType(
        { canEditPublic: true, canEditInternal: false },
        true,
      ),
    ).toBe(false);
  });

  it("requires posts:public for a public post (internal false or null/undefined)", () => {
    expect(
      canManagePostType(
        { canEditPublic: true, canEditInternal: false },
        false,
      ),
    ).toBe(true);
    expect(
      canManagePostType(
        { canEditPublic: true, canEditInternal: false },
        null,
      ),
    ).toBe(true);
    expect(
      canManagePostType(
        { canEditPublic: true, canEditInternal: false },
        undefined,
      ),
    ).toBe(true);
    expect(
      canManagePostType(
        { canEditPublic: false, canEditInternal: true },
        false,
      ),
    ).toBe(false);
  });

  it("allows everything with both permissions", () => {
    const perms = { canEditPublic: true, canEditInternal: true };
    expect(canManagePostType(perms, true)).toBe(true);
    expect(canManagePostType(perms, false)).toBe(true);
  });

  it("allows nothing with neither permission", () => {
    const perms = { canEditPublic: false, canEditInternal: false };
    expect(canManagePostType(perms, true)).toBe(false);
    expect(canManagePostType(perms, false)).toBe(false);
  });
});
