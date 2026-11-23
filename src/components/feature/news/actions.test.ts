import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionTier: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({ hasPermission: vi.fn() }));
vi.mock("@/lib/content/calendar", () => ({
  getAllContentWithCalendar: vi.fn(),
}));
const verifyLinkedEventOrUnpublishMock = vi.fn();
vi.mock("@/lib/content/termin-posts", () => ({
  verifyLinkedEventOrUnpublish: (...args: unknown[]) =>
    verifyLinkedEventOrUnpublishMock(...args),
}));

const resolveActorMock = vi.fn();
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom((...args) =>
    resolveActorMock(...args),
  ),
);
const generateMemberCalendarTokenMock = vi.fn();
vi.mock("@/lib/members/calendar-token", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/members/calendar-token")>()),
  generateMemberCalendarToken: (...args: unknown[]) =>
    generateMemberCalendarTokenMock(...args),
}));
const revalidateMemberProfileMock = vi.fn();
vi.mock("@/lib/members/revalidate-profile", () => ({
  revalidateMemberProfile: (...args: unknown[]) =>
    revalidateMemberProfileMock(...args),
}));

const { getCurrentUser } = await import("@/lib/auth/server");
const { getSessionTier } = await import("@/lib/auth/session");
const { hasPermission } = await import("@/lib/auth/permissions");
const { getAllContentWithCalendar } = await import("@/lib/content/calendar");
const {
  loadMoreNews,
  subscribeOwnInternalCalendar,
  verifyLinkedEventOrUnpublish,
} = await import("@/components/feature/news/actions");
const { NEWS_PAGE_SIZE } = await import("@/lib/content/content-types");

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

describe("subscribeOwnInternalCalendar (#439)", () => {
  it("generates the token for the caller's own member and returns the .ics URL", async () => {
    process.env.PUBLIC_SITE_URL = "https://example.org";
    resolveActorMock.mockResolvedValue({
      id: "meeple-1",
      member: { id: "member-1" },
    });
    generateMemberCalendarTokenMock.mockResolvedValue("raw-token");

    const result = await subscribeOwnInternalCalendar();

    expect(resolveActorMock).toHaveBeenCalledWith("news:internal:view");
    expect(generateMemberCalendarTokenMock).toHaveBeenCalledWith("member-1");
    expect(revalidateMemberProfileMock).toHaveBeenCalledWith({
      memberId: "member-1",
    });
    expect(result).toEqual({
      success: true,
      subscribeUrl: "https://example.org/api/calendar/internal/raw-token.ics",
    });
  });

  it("refuses without news:internal:view, without touching any token", async () => {
    resolveActorMock.mockResolvedValue(null);
    generateMemberCalendarTokenMock.mockClear();

    const result = await subscribeOwnInternalCalendar();

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(generateMemberCalendarTokenMock).not.toHaveBeenCalled();
  });

  it("refuses for an account without a linked member", async () => {
    resolveActorMock.mockResolvedValue({ id: "meeple-1", member: null });
    generateMemberCalendarTokenMock.mockClear();

    const result = await subscribeOwnInternalCalendar();

    expect(result).toHaveProperty("error");
    expect(generateMemberCalendarTokenMock).not.toHaveBeenCalled();
  });
});

describe("verifyLinkedEventOrUnpublish (#463)", () => {
  it("delegates straight through to the lib implementation", async () => {
    verifyLinkedEventOrUnpublishMock.mockResolvedValue({ stillExists: true });

    const result = await verifyLinkedEventOrUnpublish("post-1");

    expect(verifyLinkedEventOrUnpublishMock).toHaveBeenCalledWith("post-1");
    expect(result).toEqual({ stillExists: true });
  });
});
