import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionTier: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({ hasPermission: vi.fn() }));
vi.mock("@/lib/content/calendar", () => ({
  getAllContentWithCalendar: vi.fn(),
}));

const { getCurrentUser } = await import("@/lib/auth/server");
const { getSessionTier } = await import("@/lib/auth/session");
const { hasPermission } = await import("@/lib/auth/permissions");
const { getAllContentWithCalendar } = await import("@/lib/content/calendar");
const { loadMoreNews, NEWS_PAGE_SIZE } =
  await import("@/components/feature/news/actions");

const PUBLIC_ITEM = {
  slug: "public",
  type: "blog" as const,
  title: "Public",
  excerpt: "",
  body: "",
  date: "2026-01-01",
};
const INTERNAL_ITEM = { ...PUBLIC_ITEM, slug: "internal", internal: true };

describe("loadMoreNews (#470)", () => {
  it("requests the next page with the given cursor and NEWS_PAGE_SIZE", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.mocked(getSessionTier).mockResolvedValue("gast");
    vi.mocked(getAllContentWithCalendar).mockResolvedValue({
      items: [PUBLIC_ITEM],
      hasMore: true,
      nextCursor: "next-cursor",
    });

    const page = await loadMoreNews("cursor-1");

    expect(getAllContentWithCalendar).toHaveBeenCalledWith({
      take: NEWS_PAGE_SIZE,
      cursor: "cursor-1",
    });
    expect(page).toEqual({
      items: [PUBLIC_ITEM],
      hasMore: true,
      nextCursor: "next-cursor",
    });
  });

  // Sicherheitsrelevant: canSeeInternal darf nicht vom Client kommen, sonst
  // könnte ein manipulierter Aufruf interne Beiträge freischalten.
  it("re-derives visibility server-side and filters out internal posts for an unauthorized viewer", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "guest" } as never);
    vi.mocked(getSessionTier).mockResolvedValue("gast");
    vi.mocked(getAllContentWithCalendar).mockResolvedValue({
      items: [PUBLIC_ITEM, INTERNAL_ITEM],
      hasMore: false,
      nextCursor: null,
    });

    const page = await loadMoreNews("cursor-1");

    expect(hasPermission).not.toHaveBeenCalled();
    expect(page.items.map((item) => item.slug)).toEqual(["public"]);
  });

  it("includes internal posts once the current session is actually authorized", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "meeple-1" } as never);
    vi.mocked(getSessionTier).mockResolvedValue("mitglied");
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(getAllContentWithCalendar).mockResolvedValue({
      items: [PUBLIC_ITEM, INTERNAL_ITEM],
      hasMore: false,
      nextCursor: null,
    });

    const page = await loadMoreNews("cursor-1");

    expect(page.items.map((item) => item.slug)).toEqual(["public", "internal"]);
  });
});
