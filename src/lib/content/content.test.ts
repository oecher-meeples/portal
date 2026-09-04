import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  canViewContentItem,
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
    instagramDetails: null,
    surveyDetails: null,
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

    const { items, nextCursor } = await getAllContent();

    expect(items).toHaveLength(3);
    expect(items[0].date).toBe("2026-06-15");
    expect(items[0].body).toBe("Unser Sommerfest war ein voller Erfolg.");
    expect(nextCursor).toBeNull();
  });

  it("queries posts descending by date, newest first, with id as tiebreaker for deterministic cursor pagination (#252, #469)", async () => {
    prismaMock.post.findMany.mockResolvedValue(ALL_POSTS);

    await getAllContent();

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PUBLISHED" },
        orderBy: [{ date: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("without take/cursor loads everything in one page, unchanged behaviour (#469)", async () => {
    prismaMock.post.findMany.mockResolvedValue(ALL_POSTS);

    await getAllContent();

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ take: expect.anything() }),
    );
  });

  it("returns a nextCursor and trims the lookahead row when more posts remain (#469)", async () => {
    // take: 2 → Prisma wird mit take: 3 aufgerufen, die dritte (Lookahead-)
    // Zeile signalisiert "es gibt noch mehr" und wird selbst nicht ausgeliefert.
    prismaMock.post.findMany.mockResolvedValue(ALL_POSTS);

    const { items, nextCursor } = await getAllContent({ take: 2 });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.slug)).toEqual([
      ALL_POSTS[0].slug,
      ALL_POSTS[1].slug,
    ]);
    expect(nextCursor).toBe(ALL_POSTS[1].id);
  });

  it("forwards cursor as a Prisma cursor/skip pair (#469)", async () => {
    prismaMock.post.findMany.mockResolvedValue([ALL_POSTS[2]]);

    const { items, nextCursor } = await getAllContent({
      take: 2,
      cursor: ALL_POSTS[1].id,
    });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: ALL_POSTS[1].id },
        skip: 1,
        take: 3,
      }),
    );
    expect(items).toHaveLength(1);
    expect(nextCursor).toBeNull();
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
    if (condition && typeof condition === "object" && "in" in condition) {
      const allowed = (condition as { in: unknown[] }).in;
      return allowed.includes(post[key]);
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
        type: { in: ["TERMIN", "TURNIER"] },
        OR: [{ internal: null }, { internal: false }],
        status: "PUBLISHED",
      },
      orderBy: { date: "asc" },
      take: 10,
      include: {
        instagramDetails: { select: { postUrl: true } },
        surveyDetails: { select: { deadline: true } },
      },
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
  it("queries all posts descending by date with a limit, excluding UMFRAGE by default (#424)", async () => {
    prismaMock.post.findMany.mockResolvedValue(ALL_POSTS);

    await getLatestPosts(3);

    expect(prismaMock.post.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ internal: null }, { internal: false }],
        status: "PUBLISHED",
        type: { not: "UMFRAGE" },
      },
      orderBy: { date: "desc" },
      take: 3,
      include: {
        instagramDetails: { select: { postUrl: true } },
        surveyDetails: { select: { deadline: true } },
      },
    });
  });

  it("drops the UMFRAGE filter when includeSurveys is true (#424, eingeloggte Meeple)", async () => {
    prismaMock.post.findMany.mockResolvedValue(ALL_POSTS);

    await getLatestPosts(3, true);

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ internal: null }, { internal: false }],
          status: "PUBLISHED",
        },
      }),
    );
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

  it("excludes an UMFRAGE post from the guest preview even when public (#424)", async () => {
    const withSurvey = [
      ...INTERNAL_VARIANTS,
      makePost({ slug: "umfrage-public-null", type: "UMFRAGE", internal: null }),
    ];
    prismaMock.post.findMany.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async ({ where }: any) =>
        withSurvey.filter((post) => evaluateWhere(post, where))) as never,
    );

    const result = await getLatestPosts(10);

    expect(result.map((item) => item.slug)).not.toContain(
      "umfrage-public-null",
    );
  });
});
