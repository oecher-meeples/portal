import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  canViewContentItem,
  computeVisibleItems,
  getAllContent,
  getContentBySlug,
  getInternalContent,
  getLatestPosts,
  getUpcomingEvents,
} = await import("@/lib/content/content");

function makePost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "post-1",
    slug: "sommerfest-der-meeples",
    type: "BLOG" as const,
    title: "Sommerfest der Meeples",
    excerpt: "Danke an alle Helfer:innen!",
    body: "Unser Sommerfest war ein voller Erfolg.",
    date: new Date("2026-06-15"),
    author: "Jan Herwig",
    location: null,
    internal: null,
    instagram: true,
    status: "PUBLISHED" as const,
    coverImageUrl: null,
    instagramStatus: null,
    instagramPostUrl: null,
    instagramAttempts: 0,
    instagramLastError: null,
    sendAsNewsletter: false,
    newsletterCategory: null,
    newsletterStatus: null,
    newsletterAttempts: 0,
    newsletterLastError: null,
    newsletterSentAt: null,
    ...overrides,
  };
}

const ALL_POSTS = [
  makePost(),
  makePost({
    slug: "kennerspiel-turnier-09-08",
    type: "TURNIER",
    title: "Kennerspiel-Turnier",
    date: new Date("2026-08-09"),
    author: null,
    instagram: null,
  }),
  makePost({
    slug: "offener-spieleabend-01-08",
    type: "TERMIN",
    title: "Offener Spieleabend",
    date: new Date("2026-08-01"),
    author: null,
    instagram: null,
  }),
];

describe("getAllContent", () => {
  it("loads all posts from the database, including the body (#135)", async () => {
    prismaMock.post.findMany.mockResolvedValue(ALL_POSTS);

    const items = await getAllContent();

    expect(items).toHaveLength(3);
    expect(items[0].date).toBe("2026-06-15");
    expect(items[0].body).toBe("Unser Sommerfest war ein voller Erfolg.");
  });
});

describe("getInternalContent", () => {
  it("queries internal posts descending by date", async () => {
    prismaMock.post.findMany.mockResolvedValue(
      ALL_POSTS.filter((post) => post.internal),
    );

    await getInternalContent(5);

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { internal: true, status: "PUBLISHED" },
        orderBy: { date: "desc" },
        take: 5,
      }),
    );
  });

  it("delivers internal posts but not public ones (real Prisma NULL semantics)", async () => {
    prismaMock.post.findMany.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async ({ where }: any) =>
        INTERNAL_VARIANTS.filter((post) =>
          evaluateWhere(post, where),
        )) as never,
    );

    const result = await getInternalContent();

    expect(result.map((item) => item.slug)).toEqual(["termin-hidden"]);
  });
});

describe("getContentBySlug", () => {
  it("resolves a post by its slug", async () => {
    prismaMock.post.findUnique.mockResolvedValue(ALL_POSTS[0]);

    const item = await getContentBySlug("sommerfest-der-meeples");

    expect(item?.title).toBe("Sommerfest der Meeples");
    expect(item?.author).toBe("Jan Herwig");
  });

  it("returns undefined for an unknown slug", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);

    expect(await getContentBySlug("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for a draft post", async () => {
    prismaMock.post.findUnique.mockResolvedValue(
      makePost({ status: "DRAFT" }),
    );

    expect(await getContentBySlug("sommerfest-der-meeples")).toBeUndefined();
  });
});

// Mimics Postgres three-valued `<>` comparison logic so tests catch what a
// naive mock (that only asserts on the `where` argument) would miss: `not: true`
// silently drops rows where the column is NULL.
function evaluateWhere(
  post: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") {
      return (condition as Record<string, unknown>[]).some((sub) =>
        evaluateWhere(post, sub),
      );
    }
    if (condition && typeof condition === "object" && "not" in condition) {
      const excluded = (condition as { not: unknown }).not;
      const value = post[key];
      if (value === null || value === undefined) return false;
      return value !== excluded;
    }
    return post[key] === condition;
  });
}

const INTERNAL_VARIANTS = [
  makePost({ slug: "termin-public-null", type: "TERMIN", internal: null }),
  makePost({ slug: "termin-public-false", type: "TERMIN", internal: false }),
  makePost({ slug: "termin-hidden", type: "TERMIN", internal: true }),
  makePost({ slug: "blog-public-null", type: "BLOG", internal: null }),
];

describe("getUpcomingEvents", () => {
  it("excludes blog posts and queries ascending by date", async () => {
    const events = ALL_POSTS.filter((post) => post.type !== "BLOG");
    prismaMock.post.findMany.mockResolvedValue(events);

    const result = await getUpcomingEvents(10);

    expect(result.every((item) => item.type !== "blog")).toBe(true);
    expect(prismaMock.post.findMany).toHaveBeenCalledWith({
      where: {
        type: { not: "BLOG" },
        OR: [{ internal: null }, { internal: false }],
        status: "PUBLISHED",
      },
      orderBy: { date: "asc" },
      take: 10,
    });
  });

  it("includes internal: null events but excludes internal: true and blog posts (real Prisma NULL semantics)", async () => {
    prismaMock.post.findMany.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async ({ where }: any) =>
        INTERNAL_VARIANTS.filter((post) =>
          evaluateWhere(post, where),
        )) as never,
    );

    const result = await getUpcomingEvents(10);

    expect(result.map((item) => item.slug)).toEqual([
      "termin-public-null",
      "termin-public-false",
    ]);
  });
});

describe("computeVisibleItems", () => {
  it("slices down to the visible count", () => {
    expect(computeVisibleItems([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
  });

  it("returns all items when the count exceeds the list length", () => {
    expect(computeVisibleItems([1, 2], 10)).toEqual([1, 2]);
  });

  it("returns an empty array for a zero or negative count", () => {
    expect(computeVisibleItems([1, 2, 3], 0)).toEqual([]);
    expect(computeVisibleItems([1, 2, 3], -5)).toEqual([]);
  });
});

describe("canViewContentItem", () => {
  it("allows a public post regardless of session", () => {
    expect(canViewContentItem({ internal: undefined }, false)).toBe(true);
    expect(canViewContentItem({ internal: undefined }, true)).toBe(true);
  });

  it("blocks an internal post without a session — detail call must 404", () => {
    expect(canViewContentItem({ internal: true }, false)).toBe(false);
  });

  it("allows an internal post with a session", () => {
    expect(canViewContentItem({ internal: true }, true)).toBe(true);
  });
});

describe("getLatestPosts", () => {
  it("queries all posts descending by date with a limit", async () => {
    prismaMock.post.findMany.mockResolvedValue(ALL_POSTS);

    await getLatestPosts(3);

    expect(prismaMock.post.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ internal: null }, { internal: false }],
        status: "PUBLISHED",
      },
      orderBy: { date: "desc" },
      take: 3,
    });
  });

  it("includes internal: null posts but excludes internal: true (real Prisma NULL semantics)", async () => {
    prismaMock.post.findMany.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async ({ where }: any) =>
        INTERNAL_VARIANTS.filter((post) =>
          evaluateWhere(post, where),
        )) as never,
    );

    const result = await getLatestPosts(10);

    expect(result.map((item) => item.slug).sort()).toEqual([
      "blog-public-null",
      "termin-public-false",
      "termin-public-null",
    ]);
  });
});
