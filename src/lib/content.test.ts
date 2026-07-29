import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const {
  canViewContentItem,
  getAllContent,
  getContentBySlug,
  getLatestPosts,
  getUpcomingEvents,
} = await import("@/lib/content");

function makePost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
  it("loads all posts from the database", async () => {
    prismaMock.post.findMany.mockResolvedValue(ALL_POSTS);

    const items = await getAllContent();

    expect(items).toHaveLength(3);
    expect(items[0].date).toBe("2026-06-15");
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
});

describe("getUpcomingEvents", () => {
  it("excludes blog posts and queries ascending by date", async () => {
    const events = ALL_POSTS.filter((post) => post.type !== "BLOG");
    prismaMock.post.findMany.mockResolvedValue(events);

    const result = await getUpcomingEvents(10);

    expect(result.every((item) => item.type !== "blog")).toBe(true);
    expect(prismaMock.post.findMany).toHaveBeenCalledWith({
      where: { type: { not: "BLOG" }, internal: { not: true } },
      orderBy: { date: "asc" },
      take: 10,
    });
  });

  it("excludes internal posts from the public preview", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);

    await getUpcomingEvents(5);

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ internal: { not: true } }) }),
    );
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
      where: { internal: { not: true } },
      orderBy: { date: "desc" },
      take: 3,
    });
  });
});
