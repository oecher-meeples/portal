import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ hasPermission: vi.fn() }));

const { hasPermission } = await import("@/lib/auth/permissions");
const { resolveNewsVisibility, filterVisibleNews } = await import(
  "@/lib/content/news-visibility"
);

describe("resolveNewsVisibility", () => {
  it("denies internal content for a guest, without even checking the permission", async () => {
    const result = await resolveNewsVisibility(null, "gast");

    expect(result).toEqual({ canSeeInternal: false, isMember: false });
    expect(hasPermission).not.toHaveBeenCalled();
  });

  it("checks the real permission for a logged-in member", async () => {
    vi.mocked(hasPermission).mockResolvedValue(true);

    const result = await resolveNewsVisibility({ id: "meeple-1" }, "mitglied");

    expect(result).toEqual({ canSeeInternal: true, isMember: true });
    expect(hasPermission).toHaveBeenCalledWith(
      "meeple-1",
      "news:internal:view",
    );
  });

  it("denies internal content when the permission is missing, even for a member", async () => {
    vi.mocked(hasPermission).mockResolvedValue(false);

    const result = await resolveNewsVisibility({ id: "meeple-1" }, "mitglied");

    expect(result.canSeeInternal).toBe(false);
    expect(result.isMember).toBe(true);
  });
});

describe("filterVisibleNews", () => {
  const PUBLIC_POST = {
    slug: "public",
    type: "blog" as const,
    title: "Public",
    excerpt: "",
    body: "",
    date: "2026-01-01",
  };
  const INTERNAL_POST = { ...PUBLIC_POST, slug: "internal", internal: true };
  const SURVEY_POST = {
    ...PUBLIC_POST,
    slug: "survey",
    type: "umfrage" as const,
  };

  it("hides internal posts without canSeeInternal", () => {
    const result = filterVisibleNews([PUBLIC_POST, INTERNAL_POST], {
      canSeeInternal: false,
      isMember: true,
    });

    expect(result.map((item) => item.slug)).toEqual(["public"]);
  });

  it("hides survey posts for non-members (#424)", () => {
    const result = filterVisibleNews([PUBLIC_POST, SURVEY_POST], {
      canSeeInternal: false,
      isMember: false,
    });

    expect(result.map((item) => item.slug)).toEqual(["public"]);
  });

  it("shows everything for an authorized member", () => {
    const result = filterVisibleNews(
      [PUBLIC_POST, INTERNAL_POST, SURVEY_POST],
      { canSeeInternal: true, isMember: true },
    );

    expect(result.map((item) => item.slug)).toEqual([
      "public",
      "internal",
      "survey",
    ]);
  });
});
